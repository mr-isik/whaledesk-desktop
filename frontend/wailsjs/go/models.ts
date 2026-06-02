export namespace bindings {
	
	export class CollectionPageResult {
	    items: domain.AICollectionItem[];
	    total: number;
	    page: number;
	    page_size: number;
	
	    static createFrom(source: any = {}) {
	        return new CollectionPageResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.items = this.convertValues(source["items"], domain.AICollectionItem);
	        this.total = source["total"];
	        this.page = source["page"];
	        this.page_size = source["page_size"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace domain {
	
	export class AICollection {
	    id: number;
	    name: string;
	    doc_input: string;
	    item_count: number;
	    // Go type: time
	    created_at: any;
	
	    static createFrom(source: any = {}) {
	        return new AICollection(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.doc_input = source["doc_input"];
	        this.item_count = source["item_count"];
	        this.created_at = this.convertValues(source["created_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class AICollectionItem {
	    id: number;
	    collection_id: number;
	    name: string;
	    description: string;
	    method: string;
	    url: string;
	    headers: string;
	    payload: string;
	    sort_order: number;
	
	    static createFrom(source: any = {}) {
	        return new AICollectionItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.collection_id = source["collection_id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.method = source["method"];
	        this.url = source["url"];
	        this.headers = source["headers"];
	        this.payload = source["payload"];
	        this.sort_order = source["sort_order"];
	    }
	}
	export class APIRequest {
	    id: number;
	    url: string;
	    method: string;
	    headers: string;
	    payload: string;
	    response: string;
	    status: number;
	    // Go type: time
	    created_at: any;
	
	    static createFrom(source: any = {}) {
	        return new APIRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.url = source["url"];
	        this.method = source["method"];
	        this.headers = source["headers"];
	        this.payload = source["payload"];
	        this.response = source["response"];
	        this.status = source["status"];
	        this.created_at = this.convertValues(source["created_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Port {
	    ip: string;
	    private_port: number;
	    public_port: number;
	    type: string;
	
	    static createFrom(source: any = {}) {
	        return new Port(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ip = source["ip"];
	        this.private_port = source["private_port"];
	        this.public_port = source["public_port"];
	        this.type = source["type"];
	    }
	}
	export class Container {
	    id: string;
	    short_id: string;
	    name: string;
	    image: string;
	    status: string;
	    state: string;
	    ports: Port[];
	    labels: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new Container(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.short_id = source["short_id"];
	        this.name = source["name"];
	        this.image = source["image"];
	        this.status = source["status"];
	        this.state = source["state"];
	        this.ports = this.convertValues(source["ports"], Port);
	        this.labels = source["labels"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ContainerLog {
	    container_id: string;
	    stream: string;
	    log: string;
	    timestamp: string;
	
	    static createFrom(source: any = {}) {
	        return new ContainerLog(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.container_id = source["container_id"];
	        this.stream = source["stream"];
	        this.log = source["log"];
	        this.timestamp = source["timestamp"];
	    }
	}
	export class ContainerStats {
	    container_id: string;
	    cpu_percent: number;
	    memory_usage: number;
	    memory_limit: number;
	    memory_percent: number;
	    network_rx: number;
	    network_tx: number;
	
	    static createFrom(source: any = {}) {
	        return new ContainerStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.container_id = source["container_id"];
	        this.cpu_percent = source["cpu_percent"];
	        this.memory_usage = source["memory_usage"];
	        this.memory_limit = source["memory_limit"];
	        this.memory_percent = source["memory_percent"];
	        this.network_rx = source["network_rx"];
	        this.network_tx = source["network_tx"];
	    }
	}
	export class DbColumn {
	    name: string;
	    data_type: string;
	    is_nullable: boolean;
	    default_value?: string;
	    is_primary_key: boolean;
	    is_unique: boolean;
	
	    static createFrom(source: any = {}) {
	        return new DbColumn(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.data_type = source["data_type"];
	        this.is_nullable = source["is_nullable"];
	        this.default_value = source["default_value"];
	        this.is_primary_key = source["is_primary_key"];
	        this.is_unique = source["is_unique"];
	    }
	}
	export class DbConnection {
	    id: string;
	    name: string;
	    type: string;
	    host: string;
	    port: number;
	    user: string;
	    password: string;
	    database: string;
	    ssl_mode: string;
	
	    static createFrom(source: any = {}) {
	        return new DbConnection(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.type = source["type"];
	        this.host = source["host"];
	        this.port = source["port"];
	        this.user = source["user"];
	        this.password = source["password"];
	        this.database = source["database"];
	        this.ssl_mode = source["ssl_mode"];
	    }
	}
	export class DbDatabase {
	    name: string;
	    owner: string;
	
	    static createFrom(source: any = {}) {
	        return new DbDatabase(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.owner = source["owner"];
	    }
	}
	export class DbSchema {
	    name: string;
	
	    static createFrom(source: any = {}) {
	        return new DbSchema(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	    }
	}
	export class DbTable {
	    schema: string;
	    name: string;
	    table_type: string;
	    row_count?: number;
	
	    static createFrom(source: any = {}) {
	        return new DbTable(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.schema = source["schema"];
	        this.name = source["name"];
	        this.table_type = source["table_type"];
	        this.row_count = source["row_count"];
	    }
	}
	export class EnvVariable {
	    id: string;
	    env_id: string;
	    key: string;
	    value: string;
	    is_secret: boolean;
	    description: string;
	
	    static createFrom(source: any = {}) {
	        return new EnvVariable(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.env_id = source["env_id"];
	        this.key = source["key"];
	        this.value = source["value"];
	        this.is_secret = source["is_secret"];
	        this.description = source["description"];
	    }
	}
	export class Environment {
	    id: string;
	    name: string;
	    is_active: boolean;
	    variables: EnvVariable[];
	    // Go type: time
	    created_at: any;
	
	    static createFrom(source: any = {}) {
	        return new Environment(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.is_active = source["is_active"];
	        this.variables = this.convertValues(source["variables"], EnvVariable);
	        this.created_at = this.convertValues(source["created_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ImageInfo {
	    id: string;
	    tags: string[];
	    size: number;
	    created: number;
	
	    static createFrom(source: any = {}) {
	        return new ImageInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.tags = source["tags"];
	        this.size = source["size"];
	        this.created = source["created"];
	    }
	}
	
	export class QueryResult {
	    columns: string[];
	    rows: any[][];
	    rows_affected: number;
	    error_message?: string;
	
	    static createFrom(source: any = {}) {
	        return new QueryResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.columns = source["columns"];
	        this.rows = source["rows"];
	        this.rows_affected = source["rows_affected"];
	        this.error_message = source["error_message"];
	    }
	}
	export class RowDeleteRequest {
	    schema: string;
	    table: string;
	    primary_keys: any[];
	
	    static createFrom(source: any = {}) {
	        return new RowDeleteRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.schema = source["schema"];
	        this.table = source["table"];
	        this.primary_keys = source["primary_keys"];
	    }
	}
	export class RowMutation {
	    schema: string;
	    table: string;
	    data: Record<string, any>;
	
	    static createFrom(source: any = {}) {
	        return new RowMutation(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.schema = source["schema"];
	        this.table = source["table"];
	        this.data = source["data"];
	    }
	}
	export class TableDataRequest {
	    schema: string;
	    table: string;
	    page: number;
	    page_size: number;
	    sort_col: string;
	    sort_dir: string;
	
	    static createFrom(source: any = {}) {
	        return new TableDataRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.schema = source["schema"];
	        this.table = source["table"];
	        this.page = source["page"];
	        this.page_size = source["page_size"];
	        this.sort_col = source["sort_col"];
	        this.sort_dir = source["sort_dir"];
	    }
	}
	export class TableDataResult {
	    columns: DbColumn[];
	    rows: any[][];
	    total_rows: number;
	    page: number;
	    page_size: number;
	    total_pages: number;
	
	    static createFrom(source: any = {}) {
	        return new TableDataResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.columns = this.convertValues(source["columns"], DbColumn);
	        this.rows = source["rows"];
	        this.total_rows = source["total_rows"];
	        this.page = source["page"];
	        this.page_size = source["page_size"];
	        this.total_pages = source["total_pages"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace ports {
	
	export class AIGenerateResponse {
	    name: string;
	    description: string;
	    method: string;
	    url: string;
	    headers: Record<string, string>;
	    body: string;
	
	    static createFrom(source: any = {}) {
	        return new AIGenerateResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.description = source["description"];
	        this.method = source["method"];
	        this.url = source["url"];
	        this.headers = source["headers"];
	        this.body = source["body"];
	    }
	}

}

