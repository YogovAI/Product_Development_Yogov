"""
Dynamic table creator for PostgreSQL
Creates tables based on inferred schema from data
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)

class TableCreator:
    """Create PostgreSQL tables dynamically"""
    
    @staticmethod
    async def create_table(
        db: AsyncSession,
        table_name: str,
        schema: Dict[str, str],
        drop_if_exists: bool = True
    ) -> Dict[str, any]:
        """
        Create a table in PostgreSQL with the given schema
        
        Args:
            db: Database session
            table_name: Name of the table to create
            schema: Dict of {column_name: postgres_type}
            drop_if_exists: Whether to drop existing table
            
        Returns:
            Dict with creation status and details
        """
        try:
            # Sanitize table name (remove special characters, spaces)
            table_name = TableCreator._sanitize_table_name(table_name)
            
            # Drop table if exists
            if drop_if_exists:
                drop_sql = f"DROP TABLE IF EXISTS {table_name} CASCADE"
                await db.execute(text(drop_sql))
                logger.info(f"Dropped existing table: {table_name}")
            
            # Build CREATE TABLE statement
            columns = []
            for col_name, col_type in schema.items():
                sanitized_col = TableCreator._sanitize_column_name(col_name)
                columns.append(f"{sanitized_col} {col_type}")
            
            # Add auto-increment ID column
            columns.insert(0, "id SERIAL PRIMARY KEY")
            columns.append("created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
            
            create_sql = f"""
                CREATE TABLE {table_name} (
                    {', '.join(columns)}
                )
            """
            
            await db.execute(text(create_sql))
            await db.commit()
            
            logger.info(f"Created table: {table_name} with {len(schema)} columns")
            
            return {
                "success": True,
                "table_name": table_name,
                "columns": list(schema.keys()),
                "column_count": len(schema)
            }
            
        except Exception as e:
            logger.error(f"Error creating table {table_name}: {e}")
            await db.rollback()
            raise
    
    @staticmethod
    async def insert_data(
        db: AsyncSession,
        table_name: str,
        data: List[Dict],
        batch_size: int = 1000
    ) -> Dict[str, any]:
        """
        Insert data into table in batches
        
        Args:
            db: Database session
            table_name: Target table name
            data: List of dictionaries with data
            batch_size: Number of rows per batch
            
        Returns:
            Dict with insertion status
        """
        try:
            table_name = TableCreator._sanitize_table_name(table_name)
            total_rows = len(data)
            inserted_rows = 0
            
            # Process in batches
            for i in range(0, total_rows, batch_size):
                batch = data[i:i + batch_size]
                
                if not batch:
                    continue
                
                # Get column names from first row
                columns = [TableCreator._sanitize_column_name(col) for col in batch[0].keys()]
                column_str = ', '.join(columns)
                
                # Build VALUES clause
                values_list = []
                for row in batch:
                    values = []
                    for col in batch[0].keys():
                        value = row.get(col)
                        if value is None or (isinstance(value, float) and pd.isna(value)):
                            values.append('NULL')
                        elif isinstance(value, str):
                            # Escape single quotes
                            escaped_value = value.replace("'", "''")
                            values.append(f"'{escaped_value}'")
                        elif isinstance(value, (int, float)):
                            values.append(str(value))
                        else:
                            values.append(f"'{str(value)}'")
                    values_list.append(f"({', '.join(values)})")
                
                insert_sql = f"""
                    INSERT INTO {table_name} ({column_str})
                    VALUES {', '.join(values_list)}
                """
                
                await db.execute(text(insert_sql))
                inserted_rows += len(batch)
                
                logger.info(f"Inserted batch {i//batch_size + 1}: {len(batch)} rows")
            
            await db.commit()
            
            return {
                "success": True,
                "table_name": table_name,
                "total_rows": total_rows,
                "inserted_rows": inserted_rows
            }
            
        except Exception as e:
            logger.error(f"Error inserting data into {table_name}: {e}")
            await db.rollback()
            raise
    
    @staticmethod
    def _sanitize_table_name(name: str) -> str:
        """Sanitize table name for PostgreSQL"""
        # Remove file extension if present
        name = name.replace('.csv', '').replace('.json', '').replace('.xlsx', '')
        # Replace spaces and special characters with underscores
        name = ''.join(c if c.isalnum() or c == '_' else '_' for c in name)
        # Ensure it starts with a letter
        if name and not name[0].isalpha():
            name = 'table_' + name
        # Convert to lowercase
        return name.lower()
    
    @staticmethod
    def _sanitize_column_name(name: str) -> str:
        """Sanitize column name for PostgreSQL"""
        # Replace spaces and special characters with underscores
        name = ''.join(c if c.isalnum() or c == '_' else '_' for c in name)
        # Ensure it starts with a letter
        if name and not name[0].isalpha():
            name = 'col_' + name
        # Convert to lowercase
        return name.lower()

# Import pandas for NaN check
import pandas as pd
