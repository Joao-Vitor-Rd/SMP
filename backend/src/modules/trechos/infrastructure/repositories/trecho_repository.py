import logging
import requests
from datetime import datetime
from sqlalchemy import and_, desc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from src.modules.fotos.domain.entities.fotos import fotosORM
from src.modules.trechos.application.dtos.trecho_filter_dto import TrechoBoundingBoxFilterDTO
from src.modules.trechos.domain.entities.trecho import Trecho, TrechoORM
from src.modules.trechos.domain.repositories.i_trecho_repository import ITrechoRepository
from src.shared.domain.entities.user import UserORM

logger = logging.getLogger(__name__)


def reverse_geocode(lat: float, lon: float) -> tuple[str | None, str | None]:
    url = "https://nominatim.openstreetmap.org/reverse"
    headers = {
        "User-Agent": "SMP-App/1.0 (contact@smp-roadsense.com)"
    }
    params = {
        "lat": lat,
        "lon": lon,
        "format": "jsonv2",
        "addressdetails": 1,
        "accept-language": "pt-br"
    }
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            address = data.get("address", {})
            cidade = address.get("city") or address.get("town") or address.get("village") or address.get("municipality") or address.get("suburb")
            estado = address.get("state")
            uf = address.get("state_code")

            if not uf or len(uf) != 2:
                state_to_uf = {
                    "acre": "AC", "alagoas": "AL", "amazonas": "AM", "amapá": "AP",
                    "bahia": "BA", "ceará": "CE", "distrito federal": "DF", "espírito santo": "ES",
                    "goiás": "GO", "maranhão": "MA", "minas gerais": "MG", "mato grosso do sul": "MS",
                    "mato grosso": "MT", "pará": "PA", "paraíba": "PB", "pernambuco": "PE",
                    "piauí": "PI", "paraná": "PR", "rio de janeiro": "RJ", "rio grande do norte": "RN",
                    "rondônia": "RO", "roraima": "RR", "rio grande do sul": "RS", "santa catarina": "SC",
                    "sergipe": "SE", "são paulo": "SP", "tocantins": "TO"
                }
                if estado:
                    uf = state_to_uf.get(estado.lower().strip())

            if uf:
                uf = uf.upper()
            return cidade, uf
    except Exception as e:
        logger.error(f"Erro ao realizar geocodificacao reversa: {e}")
    return None, None


class TrechoRepository(ITrechoRepository):
    def __init__(self, session: Session):
        self.session = session

    def create_with_fotos(
        self,
        foto_ids: list[int],
        responsavel_tecnico: str | None = None,
        defeitos: dict | None = None,
        responsavel_id: int | None = None,
        classificacao_qualidade: str | None = None,
    ) -> Trecho:
        cidade, uf = None, None
        if foto_ids:
            first_foto = self.session.query(fotosORM).filter(
                fotosORM.id.in_(foto_ids),
                fotosORM.latitude.is_not(None),
                fotosORM.longitude.is_not(None)
            ).first()
            if first_foto:
                cidade, uf = reverse_geocode(first_foto.latitude, first_foto.longitude)

        if responsavel_id is not None and not responsavel_tecnico:
            user_orm = self.session.query(UserORM).filter(UserORM.id == responsavel_id).first()
            if user_orm:
                responsavel_tecnico = user_orm.nome

        trecho_orm = TrechoORM(
            cidade=cidade,
            uf=uf,
            responsavel_tecnico=responsavel_tecnico,
            classificacao_qualidade=classificacao_qualidade,  # will be null by default
            defeitos=defeitos,
            responsavel_id=responsavel_id
        )
        self.session.add(trecho_orm)
        self.session.flush()

        if foto_ids:
            self.session.query(fotosORM).filter(fotosORM.id.in_(foto_ids)).update(
                {fotosORM.trecho_id: trecho_orm.id_trecho},
                synchronize_session=False,
            )

        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise ValueError("Erro ao criar trecho e associar fotos") from exc

        self.session.refresh(trecho_orm)
        return Trecho.model_validate(trecho_orm)

    def list_all(
        self,
        bbox_filter: TrechoBoundingBoxFilterDTO | None = None,
        cidade: str | None = None,
        uf: str | None = None,
        responsavel_tecnico: str | None = None,
        classificacao_qualidade: str | None = None,
        data_inicio: datetime | None = None,
        data_fim: datetime | None = None,
        responsavel_id: int | None = None,
        page: int | None = None,
        limit: int | None = None,
    ) -> tuple[list[Trecho], int]:
        try:
            self.session.expire_all()
        except Exception:
            pass

        query = self.session.query(TrechoORM)

        # Filters
        if bbox_filter is not None:
            query = query.filter(
                TrechoORM.fotos.any(
                    and_(
                        fotosORM.latitude.is_not(None),
                        fotosORM.longitude.is_not(None),
                        fotosORM.latitude >= bbox_filter.bottom_right_lat,
                        fotosORM.latitude <= bbox_filter.top_left_lat,
                        fotosORM.longitude >= bbox_filter.top_left_lng,
                        fotosORM.longitude <= bbox_filter.bottom_right_lng,
                    )
                )
            )

        if cidade:
            query = query.filter(TrechoORM.cidade.ilike(f"%{cidade}%"))

        if uf:
            query = query.filter(TrechoORM.uf.ilike(uf))

        if responsavel_tecnico:
            query = query.filter(TrechoORM.responsavel_tecnico.ilike(f"%{responsavel_tecnico}%"))

        if classificacao_qualidade:
            query = query.filter(TrechoORM.classificacao_qualidade == classificacao_qualidade)

        if data_inicio:
            query = query.filter(TrechoORM.criado_em >= data_inicio)

        if data_fim:
            query = query.filter(TrechoORM.criado_em <= data_fim)

        if responsavel_id is not None:
            query = query.filter(TrechoORM.responsavel_id == responsavel_id)

        # Count total
        total = query.count()

        # Order by newest to oldest
        query = query.options(selectinload(TrechoORM.fotos)).order_by(desc(TrechoORM.criado_em))

        # Pagination
        if page is not None and limit is not None and page > 0 and limit > 0:
            offset = (page - 1) * limit
            query = query.offset(offset).limit(limit)

        trechos_orm = query.all()
        return [Trecho.model_validate(t) for t in trechos_orm], total

    def find_by_id(self, id_trecho: str) -> Trecho | None:
        trecho_orm = self.session.query(TrechoORM).options(selectinload(TrechoORM.fotos)).filter(
            TrechoORM.id_trecho == id_trecho
        ).first()
        if not trecho_orm:
            return None
        return Trecho.model_validate(trecho_orm)

    def update(self, id_trecho: str, update_data: dict) -> Trecho | None:
        trecho_orm = self.session.query(TrechoORM).filter(TrechoORM.id_trecho == id_trecho).first()
        if not trecho_orm:
            return None

        for key, value in update_data.items():
            if hasattr(trecho_orm, key):
                setattr(trecho_orm, key, value)

        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise ValueError("Erro ao atualizar trecho") from exc

        self.session.refresh(trecho_orm)
        return Trecho.model_validate(trecho_orm)
