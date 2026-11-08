export namespace main {
	
	export class AppInfo {
	    name: string;
	    tagline: string;
	    version: string;
	    goVersion: string;
	    os: string;
	    arch: string;
	
	    static createFrom(source: any = {}) {
	        return new AppInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.tagline = source["tagline"];
	        this.version = source["version"];
	        this.goVersion = source["goVersion"];
	        this.os = source["os"];
	        this.arch = source["arch"];
	    }
	}
	export class CreatedProject {
	    project: models.Project;
	    credentials: models.ProjectCredentials;
	
	    static createFrom(source: any = {}) {
	        return new CreatedProject(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.project = this.convertValues(source["project"], models.Project);
	        this.credentials = this.convertValues(source["credentials"], models.ProjectCredentials);
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

export namespace models {
	
	export class Attachment {
	    id: string;
	    messageId: string;
	    filename: string;
	    contentType: string;
	    size: number;
	    // Go type: time
	    createdAt: any;
	
	    static createFrom(source: any = {}) {
	        return new Attachment(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.messageId = source["messageId"];
	        this.filename = source["filename"];
	        this.contentType = source["contentType"];
	        this.size = source["size"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
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
	export class ServerInfo {
	    requireAuth: boolean;
	    maxMessageMb: number;
	    maxConnections: number;
	    autoStart: boolean;
	    localOnly: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ServerInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.requireAuth = source["requireAuth"];
	        this.maxMessageMb = source["maxMessageMb"];
	        this.maxConnections = source["maxConnections"];
	        this.autoStart = source["autoStart"];
	        this.localOnly = source["localOnly"];
	    }
	}
	export class SenderStat {
	    address: string;
	    count: number;
	
	    static createFrom(source: any = {}) {
	        return new SenderStat(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.address = source["address"];
	        this.count = source["count"];
	    }
	}
	export class ProjectStat {
	    projectId: string;
	    name: string;
	    status: string;
	    total: number;
	    unread: number;
	    lastReceivedAt?: string;
	
	    static createFrom(source: any = {}) {
	        return new ProjectStat(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.projectId = source["projectId"];
	        this.name = source["name"];
	        this.status = source["status"];
	        this.total = source["total"];
	        this.unread = source["unread"];
	        this.lastReceivedAt = source["lastReceivedAt"];
	    }
	}
	export class DayCount {
	    date: string;
	    count: number;
	
	    static createFrom(source: any = {}) {
	        return new DayCount(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.date = source["date"];
	        this.count = source["count"];
	    }
	}
	export class Insights {
	    attachmentCount: number;
	    attachmentBytes: number;
	    messageBytes: number;
	    avgMessageBytes: number;
	    lastReceivedAt?: string;
	    withHtml: number;
	    last7Days: DayCount[];
	    projects: ProjectStat[];
	    topSenders: SenderStat[];
	
	    static createFrom(source: any = {}) {
	        return new Insights(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.attachmentCount = source["attachmentCount"];
	        this.attachmentBytes = source["attachmentBytes"];
	        this.messageBytes = source["messageBytes"];
	        this.avgMessageBytes = source["avgMessageBytes"];
	        this.lastReceivedAt = source["lastReceivedAt"];
	        this.withHtml = source["withHtml"];
	        this.last7Days = this.convertValues(source["last7Days"], DayCount);
	        this.projects = this.convertValues(source["projects"], ProjectStat);
	        this.topSenders = this.convertValues(source["topSenders"], SenderStat);
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
	export class SMTPStatus {
	    running: boolean;
	    host: string;
	    port: number;
	    address: string;
	    activeConnections: number;
	    startedAt?: string;
	    lastError?: string;
	
	    static createFrom(source: any = {}) {
	        return new SMTPStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.running = source["running"];
	        this.host = source["host"];
	        this.port = source["port"];
	        this.address = source["address"];
	        this.activeConnections = source["activeConnections"];
	        this.startedAt = source["startedAt"];
	        this.lastError = source["lastError"];
	    }
	}
	export class Header {
	    name: string;
	    value: string;
	
	    static createFrom(source: any = {}) {
	        return new Header(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.value = source["value"];
	    }
	}
	export class Message {
	    id: string;
	    projectId: string;
	    projectName: string;
	    messageId: string;
	    fromAddress: string;
	    toAddresses: string[];
	    ccAddresses: string[];
	    bccAddresses: string[];
	    replyTo: string;
	    subject: string;
	    textBody?: string;
	    htmlBody?: string;
	    hasHtml: boolean;
	    hasText: boolean;
	    headers?: Header[];
	    rawSource?: string;
	    rawTruncated?: boolean;
	    size: number;
	    isRead: boolean;
	    attachmentCount: number;
	    // Go type: time
	    receivedAt: any;
	    attachments?: Attachment[];
	
	    static createFrom(source: any = {}) {
	        return new Message(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.projectId = source["projectId"];
	        this.projectName = source["projectName"];
	        this.messageId = source["messageId"];
	        this.fromAddress = source["fromAddress"];
	        this.toAddresses = source["toAddresses"];
	        this.ccAddresses = source["ccAddresses"];
	        this.bccAddresses = source["bccAddresses"];
	        this.replyTo = source["replyTo"];
	        this.subject = source["subject"];
	        this.textBody = source["textBody"];
	        this.htmlBody = source["htmlBody"];
	        this.hasHtml = source["hasHtml"];
	        this.hasText = source["hasText"];
	        this.headers = this.convertValues(source["headers"], Header);
	        this.rawSource = source["rawSource"];
	        this.rawTruncated = source["rawTruncated"];
	        this.size = source["size"];
	        this.isRead = source["isRead"];
	        this.attachmentCount = source["attachmentCount"];
	        this.receivedAt = this.convertValues(source["receivedAt"], null);
	        this.attachments = this.convertValues(source["attachments"], Attachment);
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
	export class DashboardStats {
	    totalMessages: number;
	    messagesToday: number;
	    unreadMessages: number;
	    projectCount: number;
	    recent: Message[];
	    smtp: SMTPStatus;
	    insights: Insights;
	    server: ServerInfo;
	
	    static createFrom(source: any = {}) {
	        return new DashboardStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.totalMessages = source["totalMessages"];
	        this.messagesToday = source["messagesToday"];
	        this.unreadMessages = source["unreadMessages"];
	        this.projectCount = source["projectCount"];
	        this.recent = this.convertValues(source["recent"], Message);
	        this.smtp = this.convertValues(source["smtp"], SMTPStatus);
	        this.insights = this.convertValues(source["insights"], Insights);
	        this.server = this.convertValues(source["server"], ServerInfo);
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
	
	
	
	
	export class MessageFilter {
	    projectId: string;
	    search: string;
	    sender: string;
	    recipient: string;
	    dateFrom: string;
	    dateTo: string;
	    unreadOnly: boolean;
	    oldestFirst: boolean;
	    limit: number;
	    offset: number;
	
	    static createFrom(source: any = {}) {
	        return new MessageFilter(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.projectId = source["projectId"];
	        this.search = source["search"];
	        this.sender = source["sender"];
	        this.recipient = source["recipient"];
	        this.dateFrom = source["dateFrom"];
	        this.dateTo = source["dateTo"];
	        this.unreadOnly = source["unreadOnly"];
	        this.oldestFirst = source["oldestFirst"];
	        this.limit = source["limit"];
	        this.offset = source["offset"];
	    }
	}
	export class MessagePage {
	    items: Message[];
	    total: number;
	    limit: number;
	    offset: number;
	
	    static createFrom(source: any = {}) {
	        return new MessagePage(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.items = this.convertValues(source["items"], Message);
	        this.total = source["total"];
	        this.limit = source["limit"];
	        this.offset = source["offset"];
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
	export class Project {
	    id: string;
	    name: string;
	    description: string;
	    smtpUsername: string;
	    status: string;
	    isSystem: boolean;
	    messageCount: number;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new Project(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.smtpUsername = source["smtpUsername"];
	        this.status = source["status"];
	        this.isSystem = source["isSystem"];
	        this.messageCount = source["messageCount"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
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
	export class ProjectCredentials {
	    projectId: string;
	    username: string;
	    password: string;
	
	    static createFrom(source: any = {}) {
	        return new ProjectCredentials(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.projectId = source["projectId"];
	        this.username = source["username"];
	        this.password = source["password"];
	    }
	}
	export class ProjectInput {
	    name: string;
	    description: string;
	
	    static createFrom(source: any = {}) {
	        return new ProjectInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.description = source["description"];
	    }
	}
	
	
	
	
	export class Settings {
	    smtpHost: string;
	    smtpPort: number;
	    requireAuth: boolean;
	    allowPublicBind: boolean;
	    maxMessageMb: number;
	    maxConnections: number;
	    autoStartSmtp: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Settings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.smtpHost = source["smtpHost"];
	        this.smtpPort = source["smtpPort"];
	        this.requireAuth = source["requireAuth"];
	        this.allowPublicBind = source["allowPublicBind"];
	        this.maxMessageMb = source["maxMessageMb"];
	        this.maxConnections = source["maxConnections"];
	        this.autoStartSmtp = source["autoStartSmtp"];
	    }
	}
	export class StorageInfo {
	    dataDir: string;
	    databasePath: string;
	    attachmentsDir: string;
	    rawDir: string;
	
	    static createFrom(source: any = {}) {
	        return new StorageInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.dataDir = source["dataDir"];
	        this.databasePath = source["databasePath"];
	        this.attachmentsDir = source["attachmentsDir"];
	        this.rawDir = source["rawDir"];
	    }
	}
	export class UpdateProjectInput {
	    id: string;
	    name: string;
	    description: string;
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new UpdateProjectInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.status = source["status"];
	    }
	}

}

export namespace services {
	
	export class ConfigValue {
	    label: string;
	    value: string;
	
	    static createFrom(source: any = {}) {
	        return new ConfigValue(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.label = source["label"];
	        this.value = source["value"];
	    }
	}
	export class SMTPConfiguration {
	    framework: string;
	    filename: string;
	    language: string;
	    snippet: string;
	    values: ConfigValue[];
	    notes: string[];
	
	    static createFrom(source: any = {}) {
	        return new SMTPConfiguration(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.framework = source["framework"];
	        this.filename = source["filename"];
	        this.language = source["language"];
	        this.snippet = source["snippet"];
	        this.values = this.convertValues(source["values"], ConfigValue);
	        this.notes = source["notes"];
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

