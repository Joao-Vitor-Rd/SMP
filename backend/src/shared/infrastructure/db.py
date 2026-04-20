import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_session():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)

def sync_schema():
    """
    Sincroniza o schema do banco de dados com os modelos definidos.
    Detecta automaticamente mudanças nas entidades e as aplica no banco.
    """
    inspector = inspect(engine)
    
    with engine.begin() as connection:
        for table in Base.metadata.tables.values():
            table_name = table.name
            
            # Se a tabela não existe, será criada por create_tables()
            if table_name not in inspector.get_table_names():
                continue
            
            existing_columns = {col['name']: col for col in inspector.get_columns(table_name)}
            
            # Verificar se há colunas novas ou modificadas
            for column in table.columns:
                col_name = column.name
                
                if col_name not in existing_columns:
                    # Coluna nova - adicionar
                    try:
                        col_type = str(column.type.compile(dialect=connection.dialect))
                        nullable = "NULL" if column.nullable else "NOT NULL"
                        default = f"DEFAULT {column.default.arg}" if column.default is not None else ""
                        
                        sql = f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type} {nullable} {default}".strip()
                        connection.execute(text(sql))
                        print(f"✓ Coluna {table_name}.{col_name} criada")
                    except Exception as e:
                        if "already exists" not in str(e).lower():
                            print(f"Aviso ao criar {table_name}.{col_name}: {e}")
