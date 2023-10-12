export { logData } from "./loggers/logger.ts";

export interface Realm {
    id: string;
    name: string;
    description?: string;
    allowedOrigins?: string[];
}

export interface Project {
    id: string;
    name: string;
    description: string;
    allowedOrigins: string[];
}

export interface ProjectOptions {
    pageLoads: {
        enabled: boolean;
        storeUserAgent: boolean;
    };
    pageClicks: {
        enabled: boolean;
        capureAllClicks: boolean;
    };
    pageScrolls: {
        enabled: boolean;
    };
}

export interface ProjectConfiguration {
    realm: Realm;
    project: Project;
    options: ProjectOptions;
}
const mockRealms: Realm[] = [
    {
        id: "01HCD7PW0S2RDW3HTSHY5J65KN",
        name: "pinta.land",
        description: "En realmbeskrivning.",
    },
    {
        id: "01HCD7QZBWY7SBJPVAN03ZJ31S",
        name: "56k.guru",
        description: "",
    },
];

const mockProjects: ProjectConfiguration[] = [
    {
        realm: {
            id: "01HCD7PW0S2RDW3HTSHY5J65KN",
            name: "pinta.land",
            description: "En realmbeskrivning.",
        },
        project: {
            id: "01HCD7QH7ZWZ9HV7BSQ7NZZ6H4",
            name: "Pinta's Posts",
            description: "En projektbeskrivning.",
            allowedOrigins: [
                "https://pinta.land",
            ],
        },
        options: {
            pageLoads: {
                enabled: true,
                storeUserAgent: true,
            },
            pageClicks: {
                enabled: true,
                capureAllClicks: false,
            },
            pageScrolls: {
                enabled: true,
            },
        },
    },
    {
        realm: {
            id: "01HCD7QZBWY7SBJPVAN03ZJ31S",
            name: "56k.guru",
            description: "",
        },
        project: {
            id: "01HCD7RJCJ55YYYX0471FYPXNE",
            name: "Lumocs",
            description: "",
            allowedOrigins: [],
        },
        options: {
            pageLoads: {
                enabled: true,
                storeUserAgent: true,
            },
            pageClicks: {
                enabled: true,
                capureAllClicks: false,
            },
            pageScrolls: {
                enabled: true,
            },
        },
    },
    {
        realm: {
            id: "01HCD7QZBWY7SBJPVAN03ZJ31S",
            name: "56k.guru",
            description: "",
        },
        project: {
            id: "01HCF6YRCKJTXZAFNRMY2W179G",
            name: "Spot",
            description: "",
            allowedOrigins: [],
        },
        options: {
            pageLoads: {
                enabled: true,
                storeUserAgent: true,
            },
            pageClicks: {
                enabled: true,
                capureAllClicks: false,
            },
            pageScrolls: {
                enabled: true,
            },
        },
    },
    {
        realm: {
            id: "01HCD7QZBWY7SBJPVAN03ZJ31S",
            name: "56k.guru",
            description: "",
        },
        project: {
            id: "01HCF709JQFEDX6VYFS77PYFMR",
            name: "Hexagon",
            description: "",
            allowedOrigins: [],
        },
        options: {
            pageLoads: {
                enabled: true,
                storeUserAgent: true,
            },
            pageClicks: {
                enabled: true,
                capureAllClicks: false,
            },
            pageScrolls: {
                enabled: true,
            },
        },
    },
];
export function getRealms() {
    return mockRealms;
}

export function getProjects() {
    return mockProjects;
}

export function getProjectSettings(projectId: string, origin: string): ProjectConfiguration | false {
    const projects = getProjects();

    const fetchedSettings = projects.find((item) => item.project.id === projectId);

    if (!fetchedSettings) {
        return false;
    }

    /*
    Disable origin check for now.

    const allowedOrigins = fetchedSettings.project.allowedOrigins
        ? fetchedSettings.project.allowedOrigins
        : fetchedSettings.realm.allowedOrigins
        ? fetchedSettings.realm.allowedOrigins
        : [];

    if (config.serverMode === "production" && !allowedOrigins.includes(origin)) {
        return false;
    }
    */

    return fetchedSettings;
}
