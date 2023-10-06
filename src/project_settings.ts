import { config } from "./config.ts";

interface Realm {
    id: string;
    name: string;
    description?: string;
    allowedOrigins?: string[];
}

interface Project {
    id: string;
    name: string;
    description?: string;
    allowedOrigins?: string[];
}

interface ProjectSettings {
    realm: Realm;
    project: Project;
    pageLoads: {
        enabled: boolean;
    };
    pageClicks: {
        enabled: boolean;
    };
    pageScrolls: {
        enabled: boolean;
    };
}

const mockData: ProjectSettings = {
    realm: {
        id: "pintaland",
        name: "pintaland",
        description: "En realmbeskrivning.",
    },
    project: {
        id: "pages",
        name: "pages",
        description: "En projektbeskrivning.",
        allowedOrigins: ["https://pinta.land", "https://test.domain"],
    },
    pageLoads: {
        enabled: true,
    },
    pageClicks: {
        enabled: true,
    },
    pageScrolls: {
        enabled: false,
    },
};

/*
const mockData: ProjectSettings = {
    realm: {
        id: "pintaland",
        name: "pintaland",
        description: "En realmbeskrivning.",
        allowedOrigins: ["https://pinta.land"],
    },
    project: {
        id: "pages",
        name: "pages",
        description: "En projektbeskrivning.",
        allowedOrigins: ["https://pinta.land", "https://test.domain"],
    },
    pageLoads: {
        enabled: true,
    },
    pageClicks: {
        enabled: true,
    },
    pageScrolls: {
        enabled: false,
    },
};
*/

export function getProjectSettings(project: string, origin: string): ProjectSettings | false {
    console.log(`Fetching project settings for ${project}, origin ${origin}`);

    const fetchedSettings = mockData;
    const allowedOrigins = fetchedSettings.project.allowedOrigins
        ? fetchedSettings.project.allowedOrigins
        : fetchedSettings.realm.allowedOrigins
        ? fetchedSettings.realm.allowedOrigins
        : [];

    if (config.serverMode === "production" && !allowedOrigins.includes(origin)) {
        return false;
    }

    return mockData;
}
