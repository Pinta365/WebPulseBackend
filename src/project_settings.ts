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

const mockData: ProjectSettings[] = [
    {
        realm: {
            id: "01HCD7PW0S2RDW3HTSHY5J65KN",
            name: "pintaland",
            description: "En realmbeskrivning.",
        },
        project: {
            id: "01HCD7QH7ZWZ9HV7BSQ7NZZ6H4",
            name: "Pinta's Posts",
            description: "En projektbeskrivning.",
            allowedOrigins: ["https://pinta.land"],
        },
        pageLoads: {
            enabled: true,
        },
        pageClicks: {
            enabled: true,
        },
        pageScrolls: {
            enabled: true,
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
        pageLoads: {
            enabled: true,
        },
        pageClicks: {
            enabled: true,
        },
        pageScrolls: {
            enabled: true,
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
        pageLoads: {
            enabled: true,
        },
        pageClicks: {
            enabled: true,
        },
        pageScrolls: {
            enabled: true,
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
        pageLoads: {
            enabled: true,
        },
        pageClicks: {
            enabled: true,
        },
        pageScrolls: {
            enabled: true,
        },
    }
];

export function getProjectSettings(projectId: string, origin: string): ProjectSettings | false {

    const fetchedSettings = mockData.find(item => item.project.id === projectId);

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

export function getProjects() {
    const projects = mockData.map(item => ({
        ...item.project,
        realmId: item.realm.id
      }));
    return projects;
}