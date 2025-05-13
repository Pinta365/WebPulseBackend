import type { Browser, Cpu, Device, Engine, Os } from "@std/http";
import type { ObjectId } from "mongodb";

export interface DbVersionDocument {
    _id: ObjectId;
    key: string;
    value: string;
}

export interface ProjectOptions {
    storeUserAgent: boolean;
    storeLocation: boolean;
    pageLoads: {
        enabled: boolean;
    };
    pageClicks: {
        enabled: boolean;
        captureAllClicks: boolean;
    };
    pageScrolls: {
        enabled: boolean;
    };
}

export interface Project {
    _id?: ObjectId;
    ownerId: string;
    name: string;
    description?: string;
    allowedOrigins?: string[];
    options: ProjectOptions;
}

export type EventPayload = PageInitPayload | PageLoadPayload | PageHidePayload | PageClickPayload | PageScrollPayload;

export interface PayloadBaseTypes {
    projectId: ObjectId;
    deviceId: ObjectId;
    sessionId: ObjectId;
    pageLoadId: ObjectId;
    timestamp: number;
    userAgent?: UserAgentData;
    location?: LocationData;
}

export interface PageLoadPayload extends PayloadBaseTypes {
    type: "pageLoad";
    referrer: string;
    title: string;
    url: string;
}

export interface PageInitPayload extends PayloadBaseTypes {
    type: "pageInit";
    referrer: string;
}

export interface PageHidePayload extends PayloadBaseTypes {
    type: "pageHide";
    title: string;
    url: string;
}

export interface PageClickPayload extends PayloadBaseTypes {
    type: "pageClick";
    targetTag?: string;
    targetId?: string;
    targetHref?: string;
    targetClass?: string;
    x?: number;
    y?: number;
}

export interface PageScrollPayload extends PayloadBaseTypes {
    type: "pageScroll";
    depth?: string;
}

export interface UserAgentData {
    browser: Browser;
    cpu: Cpu;
    device: Device;
    engine: Engine;
    os: Os;
    ua: string;
}

export interface LocationData {
    countryShort: string;
    countryLong: string;
}

export interface PageLoadObject {
    pageLoadId: ObjectId;
    timestamp: number;
    firstEventAt: number;
    lastEventAt: number;
    referrer?: string;
    title?: string;
    url?: string;
    clicks: number;
    scrolls: number;
}

export interface SessionObject {
    _id: ObjectId;
    projectId: ObjectId;
    deviceId: ObjectId;
    timestamp: number;
    firstEventAt: number;
    lastEventAt: number;
    userAgent?: UserAgentData;
    location?: LocationData;
    loads: number;
    clicks: number;
    scrolls: number;
    pageLoads: PageLoadObject[];
}

export interface DeviceObject {
    _id: ObjectId;
    projectId: ObjectId;
    firstEventAt: number;
    lastEventAt: number;
    sessionIds: ObjectId[];
    sessions: number;
    loads: number;
    clicks: number;
    scrolls: number;
}

export type IncrementData = {
    "pageLoads.$.clicks"?: number;
    "pageLoads.$.scrolls"?: number;
};

export interface IncomingEventPayload {
    projectId: string;
    deviceId: string;
    sessionId: string;
    pageLoadId: string;
    type: "pageInit" | "pageLoad" | "pageHide" | "pageClick" | "pageScroll";
    [key: string]: unknown;
}
