----------------
Input 1:
----------------
/home/yogesh/Documents/AI_Engineer/3_AI/3_NLP/projects/DataUniverse

use the above folder and need to create data as a service application which will do ETL and AI related things.  pls use react js for front end with rich ui components and fast api for backend and postgres db for backend.

Design and Requirements:
1. Source data will be of any form like flat files like csv, json, xml. Also from databases , datalakes, datawarehouses.
2. Need to extract data from data sources and map with target location.
3. Mapper needs to designed in such way source schema needs to get inferred and mapped with target schema. mapping needs to shown in UI in form of arrows.
4.After completing first 3 steps if datasize is huge in size means either we need to dask or spark for processing.
5.Also Need to add provision for use RAG and LLM. Example design  need to incorporate reading and parsing document file and convert into embeddings and persist in pgvector db. from there llm will get propmt and give responses.
6. Also all codes needs to version controlled using gitlab.

use below postgres db details for connection. Note pgvector is only installed in default db postgres.

db_host = localhost
db_port = 5418
db_user = odoo18
db_password = odoo18
database = odoo18_db

use below url for gitlab cicd

http://192.168.1.3:7171/

Also Apache Spark was running in vmware, need to give drop down to get connect to spark cluster and mention the application name and master url and deployment mode.

----------------
Input 2:
----------------


I don't know vite server. pls redesign this front end ui with react js and tailwind css alone. pls remove all components of vite server. I need simple and rich ui content.

Also, in Data Sources page, add Source_Type dropdown and have values as 1. RDBMS 2. NO SQL 3.Flat Files 4. Datalake/Lakehouse 5. API 6. Websites Scrap 7.External File Format 8.External_Sources

under source type add another drop down as source_configs and  assign values based on previous drop down as below

1.If it is RDBMS means 
      1.1 Database Name
       1.2 User Name
       1.3 User Password
       1.4 Host or IP Address
       1.5 Port
       1.6 DB Name or Service Name
2. If it is No Sql means
       1.1 Database Name
       1.2 User Name
       1.3 User Password
       1.4 Host or IP Address
       1.5 Port
       1.6 DB Name or Service Name 
3. If it is Flat File means 
       1.1 Source File Type
       1.2 Source File Name
       1.3 Source File Path
4. If it is Datalake/lakehouse means
       1.1 Connector
        1.2 Credentials
5.If it is API means 
         1.1 API URL
          1.2 Credentials if any
6.If it is External Websites scrap means
           1.1 Website Link
7.if it is External File Format means
            1.1 External File Format
             1.2 External File Format Link
8. If it is External Source means
           1.1 External Source Details

pls create one table in postgres db say Data_Sources and add all these user input details in it. I will provide db details as below.

db_host = localhost
db_port = 5418
db_user = odoo18
db_password = odoo18
db_name = odoo18_db

After that in mapper page pls create two fields one for source_schema and target_schema and then map between source_schema and target_schema and respective fields.