import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8002',
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface DataSource {
    id: number;
    name: string;
    type: string;
    source_type?: string;
    connection_details: Record<string, any>;
    created_at: string;
}

export interface DataSourceCreate {
    name: string;
    type: string;
    source_type?: string;
    connection_details: Record<string, any>;
}

export interface SchemaField {
    name: string;
    type: string;
}

export interface SourceSchema {
    source_id: number;
    source_name: string;
    fields: SchemaField[];
}

export const getSources = async () => {
    const response = await api.get<DataSource[]>('/sources/');
    return response.data;
};

export const createSource = async (source: DataSourceCreate) => {
    const response = await api.post<DataSource>('/sources/', source);
    return response.data;
};

export const updateSource = async (id: number, source: DataSourceCreate) => {
    const response = await api.put<DataSource>(`/sources/${id}`, source);
    return response.data;
};

export const deleteSource = async (id: number) => {
    await api.delete(`/sources/${id}`);
};

export const testConnection = async (id: number) => {
    const response = await api.post<{ success: boolean; message: string }>(`/sources/${id}/test-connection`);
    return response.data;
};

// Mapper API functions
export const getMapperSources = async () => {
    const response = await api.get('/mapper/sources');
    return response.data;
};

export const getSourceSchema = async (sourceId: number) => {
    const response = await api.get<SourceSchema>(`/mapper/schema/${sourceId}`);
    return response.data;
};

export interface MapperService {
    id: number;
    name: string;
    extractor_id: number;
    template_id?: number;
    target_source_id?: number;
    target_entity_type?: string;
    target_entity?: string;
    load_strategy?: string;
    mapping_config: any;
    created_at: string;
}

export const createMapping = async (mapping: any) => {
    const response = await api.post('/mapper/mapping', mapping);
    return response.data;
};

export const createMapperService = async (service: any) => {
    const response = await api.post<MapperService>('/mapper/services', service);
    return response.data;
};

export const getMapperServices = async () => {
    const response = await api.get<MapperService[]>('/mapper/services');
    return response.data;
};

// ETL API functions
export const getETLJobs = async () => {
    const response = await api.get('/etl/');
    return response.data;
};

export const executeETLJob = async (jobId: number) => {
    const response = await api.post(`/etl/execute/${jobId}`);
    return response.data;
};

export const getJobStatus = async (jobId: number) => {
    const response = await api.get(`/etl/${jobId}/status`);
    return response.data;
};

export interface TransformTemplate {
    id: number;
    name: string;
    description?: string;
    target_source_id?: number;
    target_type?: string;
    target_entity_type?: string;
    target_entity_name?: string;
    config: {
        load_strategy?: string;
        business_rules?: {
            english?: string;
            json_source?: string;
            final_yaml?: string;
            yaml?: string; // legacy support
        };
        columns: Array<{
            name: string;
            data_type: string;
            quality_rules: Record<string, any>;
            business_rules: any[];
            constraints?: {
                pg_type?: string; // e.g., INTEGER, TEXT, VARCHAR(255)
                primary_key?: boolean;
                not_null?: boolean;
            };
            transform?: {
                op: 'split';
                source_column: string;
                delimiter?: string;
                outputs: Array<{ name: string; index: number; cast?: 'int' | 'float' | 'string' }>;
            };
        }>;
    };
    created_at: string;
    updated_at?: string;
}

export const getTables = async (sourceId: number) => {
    const response = await api.get<string[]>(`/sources/${sourceId}/tables`);
    return response.data;
};

export const getColumns = async (sourceId: number, tableName: string) => {
    const response = await api.get<any[]>(`/sources/${sourceId}/columns`, {
        params: { table_name: tableName }
    });
    return response.data;
};

export const createTransformTemplate = async (template: Omit<TransformTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    const response = await api.post<TransformTemplate>('/transform/templates', template);
    return response.data;
};

export const getTransformTemplates = async () => {
    const response = await api.get<TransformTemplate[]>('/transform/templates');
    return response.data;
};

export const getTemplatesBySource = async (sourceId: number) => {
    const response = await api.get<TransformTemplate[]>(`/transform/templates/source/${sourceId}`);
    return response.data;
};

export const getTransformTemplate = async (id: number) => {
    const response = await api.get<TransformTemplate>(`/transform/templates/${id}`);
    return response.data;
};

export const updateTransformTemplate = async (id: number, template: Omit<TransformTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    const response = await api.put<TransformTemplate>(`/transform/templates/${id}`, template);
    return response.data;
};

export const deleteTransformTemplate = async (id: number) => {
    await api.delete(`/transform/templates/${id}`);
};

export interface ExtractorService {
    id: number;
    name: string;
    source_id: number;
    status: string;
    last_run?: string;
    data_volume?: string;
    records_count: number;
    schema_info?: any;
    created_at: string;
}

export const getExtractors = async () => {
    const response = await api.get<ExtractorService[]>('/extractors/');
    return response.data;
};

export const getExtractor = async (id: number) => {
    const response = await api.get<ExtractorService>(`/extractors/${id}`);
    return response.data;
};

export const createExtractor = async (extractor: any) => {
    const response = await api.post<ExtractorService>('/extractors/', extractor);
    return response.data;
};

export const updateExtractor = async (id: number, extractor: any) => {
    const response = await api.put<ExtractorService>(`/extractors/${id}`, extractor);
    return response.data;
};

export const analyzeSource = async (sourceId: number) => {
    const response = await api.post(`/extractors/analyze/${sourceId}`);
    return response.data;
};

export const deleteExtractorItem = async (id: number) => {
    await api.delete(`/extractors/${id}`);
};

export const generateBusinessRules = async (text: string) => {
    const response = await api.post<any[]>('/transform/generate_rules', { text });
    return response.data;
};

export interface LoaderService {
    id: number;
    name: string;
    mapper_service_id: number;
    load_type: string;
    status: string;
    created_at: string;
}

export const createLoaderService = async (loader: any) => {
    const response = await api.post<LoaderService>('/loaders/', loader);
    return response.data;
};

export const getLoaderServices = async () => {
    const response = await api.get<LoaderService[]>('/loaders/');
    return response.data;
};

export const deleteLoaderService = async (id: number) => {
    await api.delete(`/loaders/${id}`);
};

export const executeLoaderService = async (id: number) => {
    const response = await api.post(`/loaders/${id}/execute`);
    return response.data;
};

export default api;
