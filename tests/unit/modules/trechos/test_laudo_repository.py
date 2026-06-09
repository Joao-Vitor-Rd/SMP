import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone

from src.shared.infrastructure.db import Base
from src.shared.domain.entities.user import UserORM, CargoEnum
from src.modules.trechos.domain.entities.laudo import LaudoORM
from src.modules.trechos.infrastructure.repositories.laudo_repository import LaudoRepository


@pytest.fixture(name="db_session")
def fixture_db_session():
    # Usar um banco em memória SQLite para testar o repositório
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()


def test_deve_criar_laudo_com_sucesso(db_session):
    # Dado que temos usuários no banco
    user1 = UserORM(nome="João", email="joao@example.com", cargo=CargoEnum.SUPERVISOR)
    user2 = UserORM(nome="Maria", email="maria@example.com", cargo=CargoEnum.COLABORADOR)
    db_session.add_all([user1, user2])
    db_session.commit()

    repo = LaudoRepository(db_session)

    # Quando criamos um laudo com estes usuários
    laudo = repo.create(responsavel="Responsavel Teste", usuarios_ids=[user1.id, user2.id])

    # Então o laudo deve ser criado corretamente
    assert laudo.id is not None
    assert laudo.responsavel == "Responsavel Teste"
    assert len(laudo.usuarios) == 2
    assert laudo.usuarios[0].nome == "João"
    assert laudo.usuarios[0].cargo == CargoEnum.SUPERVISOR
    assert laudo.usuarios[1].nome == "Maria"
    assert laudo.usuarios[1].cargo == CargoEnum.COLABORADOR


def test_deve_rejeitar_criar_laudo_com_usuario_inexistente(db_session):
    repo = LaudoRepository(db_session)

    # Quando tentamos criar com ID inexistente (999)
    with pytest.raises(ValueError, match="Usuário\\(s\\) com ID\\(s\\) \\[999\\] não encontrado\\(s\\)"):
        repo.create(responsavel="Responsavel Teste", usuarios_ids=[999])


def test_deve_listar_todos_os_laudos_ordenados_por_data_decrescente(db_session):
    repo = LaudoRepository(db_session)

    # Criando laudos diretamente
    laudo1 = LaudoORM(responsavel="Laudo Antigo")
    laudo2 = LaudoORM(responsavel="Laudo Novo")
    db_session.add_all([laudo1, laudo2])
    db_session.commit()

    # Atualizando as datas manualmente para garantir ordenação distinta
    laudo1.data = datetime(2026, 1, 1, tzinfo=timezone.utc)
    laudo2.data = datetime(2026, 1, 2, tzinfo=timezone.utc)
    db_session.commit()

    # Quando listamos todos
    laudos = repo.list_all()

    # Então devem vir na ordem decrescente de data (mais recente primeiro)
    assert len(laudos) == 2
    assert laudos[0].responsavel == "Laudo Novo"
    assert laudos[1].responsavel == "Laudo Antigo"


def test_deve_buscar_laudo_por_id(db_session):
    repo = LaudoRepository(db_session)

    laudo1 = LaudoORM(responsavel="Laudo A")
    db_session.add(laudo1)
    db_session.commit()

    # Quando buscamos pelo ID existente
    laudo_encontrado = repo.find_by_id(laudo1.id)

    # Então deve retornar o laudo correto
    assert laudo_encontrado is not None
    assert laudo_encontrado.id == laudo1.id
    assert laudo_encontrado.responsavel == "Laudo A"

    # E se buscarmos por ID inexistente, deve retornar None
    assert repo.find_by_id(999) is None
