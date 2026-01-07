function ensure_array(input) {
    if (typeof input == 'object') {
        return input;
    } else if (typeof input == 'string') {
        return [input]
    } else {
        return []
    }
}


function transforming(input) {
    console.log(JSON.stringify(input));
    const output = {
        "@context": {
            vcard: 'http://www.w3.org/2006/vcard/ns#',
            owl: 'http://www.w3.org/2002/07/owl#',
            dcat: 'http://www.w3.org/ns/dcat#',
            dct: 'http://purl.org/dc/terms/',
            schema: 'http://schema.org/',
            rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
            rdfs: "http://www.w3.org/2000/01/rdf-schema#",
            foaf: "http://xmlns.com/foaf/0.1/",
            skos: "http://www.w3.org/2004/02/skos/core#",
            prov: "http://www.w3.org/ns/prov#",
        },
    };

    output['@type'] = 'dcat:Dataset';
    let oai_dc = input['oai_dc:dc'];
    let id = oai_dc['id']
    let identifiers = ensure_array(oai_dc['dc:identifier']);
    let titles = ensure_array(oai_dc['dc:title']);
    let descriptions = ensure_array(oai_dc['dc:description']);
    let types = ensure_array(oai_dc['dc:type']);
    let formats = ensure_array(oai_dc['dc:format']);
    let date = oai_dc['dc:date'];
    let publisher = oai_dc['dc:publisher'];
    let language = oai_dc['dc:language'] || params.defaultLanguage;
    let creators = ensure_array(oai_dc['dc:creator']);
    let rights = ensure_array(oai_dc['dc:rights']);
    let subjects = ensure_array(oai_dc['dc:subject']);

    output['dct:title'] = []
    output['dct:description'] = [];
    output['dct:identifier'] = [];
    output['dct:creator'] = [];
    output['dct:rights'] = [];
    output['dct:format'] = [];
    output['dct:type'] = [];
    output['dcat:contactPoint'] = [];
    output['dcat:distribution'] = [];
    output['dcat:keyword'] = [];

    for (const title of titles) {
        output['dct:title'].push({
            '@value': title,
            '@language': language,
        });
    }

    for (const description of descriptions) {
        output['dct:description'].push({
            '@value': description,
            '@language': language,
        });
    }

    for (const typ of types) {
        output['dct:type'].push({
            '@value': typ,
            '@language': language,
        });
    }

    for (const identifier of identifiers) {
        output['dct:identifier'].push({
            '@value': identifier,
            '@language': language,
        });
    }

    if (date) {
        output['dct:issued']= date[0];
        output['dct:modified'] = date[0];
    }

    for (const creator of creators) {
        output['dct:creator'].push({name: creator});
        output['dcat:contactPoint'].push({
            '@type': 'vcard:Kind',
            'http://www.w3.org/2006/vcard/ns#fn': creator,
        });
    }

    for (const format of formats) {
        if (format === 'application/x-tar') {
            output['dct:format'].push({
                "@id": 'http://publications.europa.eu/resource/authority/file-type/TAR_GZ',
                "@type": "dct:MediaTypeOrExtent",
            });
        } else {
            output['dct:format'].push({
                '@value': format,
                '@type': 'dct:MediaType',
            });
        }
    }

    for (const right of rights) {
        output['dct:rights'].push({
            '@value': right,
            '@language': language,
        });
    }

    if (id) {
        // 4turesearch
        id = id.replace('doi:', 'https://doi.org/')
        output['dcat:distribution'] = [{
            '@type': 'dcat:Distribution',
            'dct:license': output['dct:rights'],
            'dct:identifier': output['dct:identifier'],
            'dct:format': output['dct:format'],
            'dct:title': output['dct:title'],
            'dct:description': output['dct:description'],
            'dcat:accessURL': {
                '@id': encodeURI(decodeURI(id)),
            },
        }];
        if (date) {
            output['dcat:distribution'][0]['dct:issued'] = date[0];
            output['dcat:distribution'][0]['dct:modified'] = date[0];
        }
    }

    for (const subject of subjects) {
        output['dcat:keyword'].push({
            '@value': subject,
            '@language': language,
        });
    }

    if (publisher) {
        output['dct:publisher'] = {
            '@type': 'foaf:Agent',
            'foaf:name': publisher,
            'dct:type': {
                '@id': 'http://purl.org/adms/publishertype/NationalAuthority',
            },
        };
    }

    output['dct:language'] = [{
        '@language': language
    }];

    ////////////////////////////////////////////////////////////////////////////////
    let categories = [];
    let dataTheme = {
        '@id': 'http://publications.europa.eu/resource/authority/data-theme',
        '@type': 'skos:ConceptScheme',
        'dct:title': 'Data theme',
    };
    if (params.categories) {
        const category_names = params.categories.split(' ');
        for (const name of category_names) {
            let category = {
                '@id': `http://publications.europa.eu/resource/authority/data-theme/${name}`,
                '@type': 'skos:Concept',
                'skos:inScheme': dataTheme,
            };
            categories.push(category);
        }
    }
    // History
    output['dcat:theme'] = categories;
    return output;
}

function main() {
    const {getTestInput1} = require("./tests/dc.test.js");
    const input = getTestInput1();
    const output = transforming(input);
    console.log(JSON.stringify(output));
}

// const params = {
//     defaultLanguage: "en",
//     categories: "SCIE SOCI TECH",
// };

// main()
