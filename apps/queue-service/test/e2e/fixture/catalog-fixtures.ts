
export function buildRawCatalogRow(overrides: Partial<{
    nid: number;
    uuid: string;
    title: string;
    datafile: string;
    node_alias: string;
    catalog_resource_ministry: string;
    sector: string[];
    created: number; // unix seconds
    is_api_available: string;
}> = {}) {
    return {
        nid: overrides.nid ?? 1001,
        uuid: overrides.uuid ?? 'res-abc',
        title: overrides.title ?? 'Sample Dataset',
        datafile: overrides.datafile ?? 'https://data.gov.in/files/sample.csv',
        node_alias: overrides.node_alias ?? '/catalog/sample',
        catalog_resource_ministry: overrides.catalog_resource_ministry ?? 'Ministry of Testing',
        sector: overrides.sector ?? ['Testing'],
        created: overrides.created ?? Math.floor(Date.now() / 1000),
        is_api_available: overrides.is_api_available ?? '0',
    };
}

export function buildSearchResponse(rows: ReturnType<typeof buildRawCatalogRow>[], total?: number) {
    return {
        total: total ?? rows.length,
        data: { rows },
    };
}