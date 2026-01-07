function deepcopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}


function formatDate(timestamp) {
    if (typeof timestamp === 'number' && !isNaN(timestamp)) {
        const date = new Date(timestamp);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }
    return timestamp;
}

function extractGitHubInfo(url) {
    const match = url.match(/github\.com[:\/]([^\/]+)\/([^\/]+)(?:\.git)?/);
    if (match) {
        return { org: match[1], repo: match[2] };
    }
    return null;
}


function do_chapter(book, chapter, config, output) {
    output['@type'] = 'dcat:Dataset';
    let title = book['title'];
    let description = book['description'];
    let createdAt = formatDate(book['publication-date']);
    let modifiedAt = formatDate(book['date-of-last-change']);
    let version = book['book-version'];
    let identifier = `${book['identifier']}#${chapter['title']}`;
    let authors = book['authors'];
    let disciplines = book['discipline'];

    let git_info = extractGitHubInfo(book['git']);
    let license = book['license'];

    let chapterTitle = chapter['title'];
    let chapterDescription = chapter['description'];

    output['dct:identifier'] = identifier;
    output['dct:title'] = `${title} - ${chapterTitle}`;

    output['dct:description'] = '';
    if (typeof description === 'object') {
        if (description['introduction'])
            output['dct:description'] += description['introduction'];
        if (description['table-of-contents']) {
            output['dct:description'] += "\n\n## Table of Contents\n";
            output['dct:description'] += description['table-of-contents'];
            output['dct:tableOfContents'] = description['table-of-contents'];
        }
    }
    if (chapterDescription) {
        output['dct:description'] += `\n\n## ${chapterTitle}\n\n`
        output['dct:description'] += chapterDescription;
    }

    output['dct:created'] = createdAt;
    output['dct:modified'] = modifiedAt;
    output['owl:versionInfo'] = version;

    output['dcat:contactPoint'] = [];
    if (authors) {
        for (const author of authors) {
            let contactPoint = {
                '@type': 'vcard:Kind',
                'vcard:fn': `${author['given-names']} ${author['family-names']}`,
                'vcard:given-name': author['given-names'],
                'vcard:family-name': author['family-names'],
            };
            if (author.affiliation) {
                contactPoint['vcard:hasAffiliation'] = {
                    '@type': 'vcard:Organization',
                    'vcard:fn': author.affiliation,
                }
            }
            if (author.orcid) {
                contactPoint['owl:sameAs'] = author.orcid;
            }
            output['dcat:contactPoint'].push(contactPoint);
        }
    }
    // License
    const all_licenses = {};
    output['dct:license'] = [];
    if (license && license['content']) {
        let _license = {
            "@type": "dct:LicenseDocument",
            "@id": license['content']['url'],
            "rdfs:label": license['content']['name'],
        }
        output['dct:license'].push(_license);
        all_licenses['content'] = _license;
    }
    if (license && license['code']) {
        let _license = {
            "@type": "dct:LicenseDocument",
            "@id": license['code'],
        };
        output['dct:license'].push(_license);
        all_licenses['code'] = _license;
    }

    // Format
    let format = [
        // {
        //     "@id": 'https://www.iana.org/assignments/media-types/text/html',
        //     "@type": "dct:MediaType",
        //     "rdfs:label": "text/html",
        // }
        {
            "@id": 'http://publications.europa.eu/resource/authority/file-type/HTML',
            "@type": "dct:MediaTypeOrExtent",
        }
    ];

    // Distribution
    output['dcat:distribution'] = [];
    // Keyword
    output['dcat:keyword'] = [];
    const dist = {
        '@type': 'dcat:Distribution',
        'dcat:accessURL': encodeURI(decodeURI(chapter['url'])),
        'dct:description': chapter['description'],
        'dct:title': chapter['title'],
        'dct:modified': modifiedAt,
        // 'dct:format': "text/html",
        'dct:format': format,
    };
    if (all_licenses['content']) {
        dist['dct:license'] = all_licenses['content'];
    }
    output['dcat:distribution'].push(dist);

    const learningObjectives = chapter['learning-objectives'] || [];
    for (const learningObjective of learningObjectives) {
        for (const key of Object.keys(learningObjective)) {
            const values = learningObjective[key];
            if (typeof values === 'object') {
                for (const value of values) {
                    const keyword = `${key}:${value}`;
                    if (! output['dcat:keyword'].includes(keyword)) {
                        output['dcat:keyword'].push(keyword);
                    }
                }
            } else {
                const keyword = `${key}:${values}`;
                if (! output['dcat:keyword'].includes(keyword)) {
                    output['dcat:keyword'].push(keyword);
                }
            }
        }
    }
    // Keyword（cont.)
    if (config && config['launch_buttons']) {
        if (config['launch_buttons']['notebook_interface']) {
            output['dcat:keyword'].push(config['launch_buttons']['notebook_interface']);
        }
        if (config['launch_buttons']['colab_url']) {
            output['dcat:keyword'].push('Google Colab');
        }
        if (config['launch_buttons']['binderhub_url']) {
            output['dcat:keyword'].push('BinderHub');
        }
        if (config['launch_buttons']['thebe']) {
            output['dcat:keyword'].push('Thebe');
        }
    }

    // DataService
    let all_ds = [];
    if (output['dcat:keyword'].includes('BinderHub')) {
        let ds = {
            '@id': `https://mybinder.org/v2/gh/${git_info['org']}/${git_info['repo']}/main`,
            '@type': 'dcat:DataService',
            'dcat:endpointURL': encodeURI(decodeURI(`https://mybinder.org/v2/gh/${git_info['org']}/${git_info['repo']}/main`)),
            'dcat:endpointDescription': 'BinderHub',
            'dct:title': 'Run on BinderHub',
            'dcat:contactPoint': output['dcat:contactPoint'],
            'dct:format': format,
        };
        if (all_licenses['code']) {
            ds['dct:license'] = all_licenses['code'];
        }

        const dist = {
            '@type': 'dcat:Distribution',
            'dcat:accessURL': encodeURI(decodeURI(`https://mybinder.org/v2/gh/${git_info['org']}/${git_info['repo']}/main`)),
            'dct:title': 'BinderHub',
            'dct:modified': modifiedAt,
            'dcat:accessService': ds,
            'dct:format': format,
        };
        if (all_licenses['code']) {
            dist['dct:license'] = all_licenses['code'];
        }
        output['dcat:distribution'].push(dist);
        all_ds.push(ds);
    }

    if (output['dcat:keyword'].includes('Google Colab')) {
        let ds = {
            '@id': `https://colab.research.google.com/github/${git_info['org']}/${git_info['repo']}`,
            '@type': 'dcat:DataService',
            'dcat:endpointURL': encodeURI(decodeURI(`https://colab.research.google.com/github/${git_info['org']}/${git_info['repo']}`)),
            'dcat:endpointDescription': 'Google Colab',
            'dct:title': 'Run on Google Colab',
            'dcat:contactPoint': output['dcat:contactPoint'],
            'dct:format': format,
        };
        if (all_licenses['code']) {
            ds['dct:license'] = all_licenses['code'];
        }
        const dist = {
            '@type': 'dcat:Distribution',
            'dcat:accessURL': encodeURI(decodeURI(`https://colab.research.google.com/github/${git_info['org']}/${git_info['repo']}`)),
            'dct:title': 'Google Colab',
            'dct:modified': modifiedAt,
            'dcat:accessService': ds,
            'dct:format': format,
        };
        if (all_licenses['code']) {
            dist['dct:license'] = all_licenses['code'];
        }
        output['dcat:distribution'].push(dist);
        all_ds.push(ds);
    }
    // if (output['dcat:distribution'].length > 0) {
    //     for (const dist of output['dcat:distribution']) {
    //         dist['dcat:accessService'] =  all_ds;
    //     }
    // }
    output['dcat:landingPage'] = {
        "@type": "foaf:Document",
        "@id": chapter['url'],
    }
    output['foaf:page'] = [{
        "@type": "foaf:Document",
        "@id": chapter['url'],
    }];
    // Dataset Series
    output['dcat:inSeries'] = {
        "@type": "dcat:DatasetSeries",
        "@id": book['identifier'],
        "dct:title": title,
        // "dct:description": description['introduction'],
    }
}

function do_book(book, config, output) {
    output['@type'] = 'dcat:Dataset';
    let title = book['title'];
    let description = book['description'];
    let createdAt = formatDate(book['publication-date']);
    let modifiedAt = formatDate(book['date-of-last-change']);
    let version = book['book-version'];
    let identifier = book['identifier'];
    let authors = book['authors'];
    let disciplines = book['discipline'];

    let git_info = extractGitHubInfo(book['git']);
    let license = book['license'];

    output['@id'] = identifier;
    output['dct:identifier'] = identifier;
    output['dct:title'] = title;

    output['dct:description'] = '';
    if (typeof description === 'object') {
        if (description['introduction'])
            output['dct:description'] += description['introduction'];
        if (description['table-of-contents']) {
            output['dct:description'] += "\n\n## Table of Contents\n";
            output['dct:description'] += description['table-of-contents'];
            output['dct:tableOfContents'] = description['table-of-contents'];
        }
    }

    output['dct:created'] = createdAt;
    output['dct:modified'] = modifiedAt;
    output['owl:versionInfo'] = version;

    output['dcat:contactPoint'] = [];
    if (authors) {
        for (const author of authors) {
            let contactPoint = {
                '@type': 'vcard:Kind',
                'vcard:fn': `${author['given-names']} ${author['family-names']}`,
                'vcard:given-name': author['given-names'],
                'vcard:family-name': author['family-names'],
            };
            if (author.affiliation) {
                contactPoint['vcard:hasAffiliation'] = {
                    '@type': 'vcard:Organization',
                    'vcard:fn': author.affiliation,
                }
            }
            if (author.orcid) {
                contactPoint['owl:sameAs'] = author.orcid;
            }
            output['dcat:contactPoint'].push(contactPoint);
        }
    }
    // License
    const all_licenses = {};
    output['dct:license'] = [];
    if (license && license['code']) {
        let _license = {
            "@type": "dct:LicenseDocument",
            "@id": license['code'],
        };
        output['dct:license'].push(_license);
        all_licenses['code'] = _license;
    }
    if (license && license['content']) {
        let _license = {
            "@type": "dct:LicenseDocument",
            "@id": license['content']['url'],
            // "rdfs:label": license['content']['name'],
            // "dct:title": license['content']['name'],
            "foaf:name": license['content']['name'],
        }
        output['dct:license'].push(_license);
        all_licenses['content'] = _license;
    }

    // Page -> Document
    output['foaf:page'] = []
    // Distribution
    output['dcat:distribution'] = [];
    // Keyword
    output['dcat:keyword'] = [];
    if (disciplines) {
        for (const discipline of disciplines) {
            output['dcat:keyword'].push(discipline);
        }
    }
    // Format
    let format = [
        // {
        //     "@id": 'https://www.iana.org/assignments/media-types/text/html',
        //     "@type": "dct:MediaType",
        //     "rdfs:label": "text/html",
        // },
        {
            "@id": 'http://publications.europa.eu/resource/authority/file-type/HTML',
            "@type": "dct:MediaTypeOrExtent",
        }
    ];
    if (book['chapters']) {
        for (const chapter of book['chapters']) {
            const dist = {
                '@type': 'dcat:Distribution',
                'dcat:accessURL': encodeURI(decodeURI(chapter['url'])),
                'dct:description': chapter['description'],
                'dct:title': chapter['title'],
                'dct:modified': modifiedAt,
                'dct:format': format,
            };
            if (all_licenses['content']) {
                dist['dct:license'] = all_licenses['content'];
            }
            output['dcat:distribution'].push(dist);

            const learningObjectives = chapter['learning-objectives'] || [];
            for (const learningObjective of learningObjectives) {
                for (const key of Object.keys(learningObjective)) {
                    const values = learningObjective[key];
                    if (typeof values === 'object') {
                        for (const value of values) {
                            const keyword = `${key}:${value}`;
                            if (! output['dcat:keyword'].includes(keyword)) {
                                output['dcat:keyword'].push(keyword);
                            }
                        }
                    } else {
                        const keyword = `${key}:${values}`;
                        if (! output['dcat:keyword'].includes(keyword)) {
                            output['dcat:keyword'].push(keyword);
                        }
                    }
                }

            }

            output['foaf:page'].push({
                "@type": "foaf:Document",
                "@id": chapter['url'],
            });
        }
    }
    // Keyword（cont.)
    if (config && config['launch_buttons']) {
        if (config['launch_buttons']['notebook_interface']) {
            output['dcat:keyword'].push(config['launch_buttons']['notebook_interface']);
        }
        if (config['launch_buttons']['colab_url']) {
            output['dcat:keyword'].push('Google Colab');
        }
        if (config['launch_buttons']['binderhub_url']) {
            output['dcat:keyword'].push('BinderHub');
        }
        if (config['launch_buttons']['thebe']) {
            output['dcat:keyword'].push('Thebe');
        }
    }

    // DataService
    let all_ds = [];
    if (output['dcat:keyword'].includes('BinderHub')) {
        let ds = {
            '@id:': `https://mybinder.org/v2/gh/${git_info['org']}/${git_info['repo']}/main`,
            '@type': 'dcat:DataService',
            'dcat:endpointURL': encodeURI(decodeURI(`https://mybinder.org/v2/gh/${git_info['org']}/${git_info['repo']}/main`)),
            'dcat:endpointDescription': 'BinderHub',
            'dct:title': 'Run on BinderHub',
            'dcat:contactPoint': output['dcat:contactPoint'],
            'dct:format': format,
        };
        if (all_licenses['code']) {
            ds['dct:license'] = all_licenses['code'];
        }

        const dist = {
            '@type': 'dcat:Distribution',
            'dcat:accessURL': encodeURI(decodeURI(`https://mybinder.org/v2/gh/${git_info['org']}/${git_info['repo']}/main`)),
            'dct:title': 'BinderHub',
            'dct:modified': modifiedAt,
            'dcat:accessService': ds,
            'dct:format': format,
        };
        if (all_licenses['code']) {
            dist['dct:license'] = all_licenses['code'];
        }
        output['dcat:distribution'].push(dist);
        all_ds.push(ds);
    }

    if (output['dcat:keyword'].includes('Google Colab')) {
        let ds = {
            '@id': `https://colab.research.google.com/github/${git_info['org']}/${git_info['repo']}`,
            '@type': 'dcat:DataService',
            'dcat:endpointURL': encodeURI(decodeURI(`https://colab.research.google.com/github/${git_info['org']}/${git_info['repo']}`)),
            'dcat:endpointDescription': 'Google Colab',
            'dct:title': 'Run on Google Colab',
            'dcat:contactPoint': output['dcat:contactPoint'],
            'dct:format': format,
        };
        if (all_licenses['code']) {
            ds['dct:license'] = all_licenses['code'];
        }
        const dist = {
            '@type': 'dcat:Distribution',
            'dcat:accessURL': encodeURI(decodeURI(`https://colab.research.google.com/github/${git_info['org']}/${git_info['repo']}`)),
            'dct:title': 'Google Colab',
            // dct:modified        "2025-07-04";
            'dct:modified': modifiedAt,
            'dcat:accessService': ds,
            'dct:format': format,
        };
        if (all_licenses['code']) {
            dist['dct:license'] = all_licenses['code'];
        }
        output['dcat:distribution'].push(dist);
        all_ds.push(ds);
    }
    // if (output['dcat:distribution'].length > 0) {
    //     for (const dist of output['dcat:distribution']) {
    //         dist['dcat:accessService'] =  all_ds;
    //     }
    // }
}

function do_config(config, output) {
    output['@type'] = 'dcat:Dataset';
    let title = config['title'];
    output['dct:identifier'] = config['identifier'];
    output['dct:title'] = title;
    output['dct:description'] = 'metadata.yml is missing';
}

function transforming(input) {
    var output = {
        '@context': {
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

            // Agent: 'http://xmlns.com/foaf/0.1/Agent',
            // Catalog: 'http://www.w3.org/ns/dcat#Catalog',
            // CatalogRecord: 'http://www.w3.org/ns/dcat#CatalogRecord',
            // Checksum: 'http://spdx.org/rdf/terms#Checksum',
            // Concept: 'http://www.w3.org/2004/02/skos/core#Concept',
            // ConceptScheme: 'http://www.w3.org/2004/02/skos/core#ConceptScheme',
            // Dataset: 'http://www.w3.org/ns/dcat#Dataset',
            // DatasetSeries: 'http://www.w3.org/ns/dcat#DatasetSeries',
            // Distribution: 'http://www.w3.org/ns/dcat#Distribution',
            // Document: 'http://xmlns.com/foaf/0.1/Document',
            // Frequency: 'http://purl.org/dc/terms/Frequency',
            // Identifier: 'http://www.w3.org/ns/adms#Identifier',
            // Kind: 'http://www.w3.org/2006/vcard/ns#Kind',
            // LicenseDocument: 'http://purl.org/dc/terms/LicenseDocument',
            // LinguisticSystem: 'http://purl.org/dc/terms/LinguisticSystem',
            // Literal: 'http://www.w3.org/2000/01/rdf-schema#Literal',
            // Location: 'http://purl.org/dc/terms/Location',
            // MediaTypeOrExtent: 'http://purl.org/dc/terms/MediaTypeOrExtent',
            // PeriodOfTime: 'http://purl.org/dc/terms/PeriodOfTime',
            // ProvenanceStatement: 'http://purl.org/dc/terms/ProvenanceStatement',
            // Resource: 'http://www.w3.org/2000/01/rdf-schema#Resource',
            // RightsStatement: 'http://purl.org/dc/terms/RightsStatement',
            // Standard: 'http://purl.org/dc/terms/Standard',
            // DataService: 'https://www.w3.org/ns/dcat#DataService',

            // accessRights: {
            //     '@id': 'http://purl.org/dc/terms/accessRights',
            //     '@type': 'http://purl.org/dc/terms/RightsStatement',
            // },
            // accessURL: {
            //     '@id': 'http://www.w3.org/ns/dcat#accessURL',
            //     '@type': 'http://www.w3.org/2000/01/rdf-schema#Resource',
            // },
            // DataService: {
            //     '@id': 'http://www.w3.org/ns/dcat#DataService',
            //     '@type': 'https://www.w3.org/ns/dcat#DataService',
            // },
            // accrualPeriodicity: {
            //     '@id': 'http://purl.org/dc/terms/accrualPeriodicity',
            //     '@type': 'http://purl.org/dc/terms/Frequency',
            // },
            // algorithm: {
            //     '@id': 'http://spdx.org/rdf/terms#algorithm',
            //     '@type': 'http://spdx.org/rdf/terms#checksumAlgorithm_sha1',
            // },
            // application_profile: {
            //     '@id': 'http://purl.org/dc/terms/conformsTo',
            //     '@type': 'http://www.w3.org/2000/01/rdf-schema#Resource',
            // },
            // byteSize: {
            //     '@id': 'http://www.w3.org/ns/dcat#byteSize',
            //     '@type': 'http://www.w3.org/2001/XMLSchema#decimal',
            // },
            // checksum: {
            //     '@id': 'http://spdx.org/rdf/terms#checksum',
            //     '@type': 'http://spdx.org/rdf/terms#Checksum',
            // },
            // checksumValue: {
            //     '@id': 'http://spdx.org/rdf/terms#checksumValue',
            //     '@type': 'http://www.w3.org/2001/XMLSchema#hexBinary',
            // },
            // conforms_to: {
            //     '@id': 'http://purl.org/dc/terms/conformsTo',
            //     '@type': 'http://purl.org/dc/terms/Standard',
            // },
            // contactPoint: {
            //     '@id': 'http://www.w3.org/ns/dcat#contactPoint',
            //     '@type': 'http://www.w3.org/2006/vcard/ns#Kind',
            // },
            // dataset: {
            //     '@id': 'http://www.w3.org/ns/dcat#dataset',
            //     '@type': 'http://www.w3.org/ns/dcat#Dataset',
            // },
            // description: {
            //     '@id': 'http://purl.org/dc/terms/description',
            //     '@type': 'http://www.w3.org/2001/XMLSchema#string',
            // },
            // distribution: {
            //     '@id': 'http://www.w3.org/ns/dcat#distribution',
            //     '@type': 'http://www.w3.org/ns/dcat#Distribution',
            // },
            // downloadURL: {
            //     '@id': 'http://www.w3.org/ns/dcat#downloadURL',
            //     '@type': 'http://www.w3.org/2000/01/rdf-schema#Resource',
            // },
            // endpointURL: {
            //     '@id': 'http://www.w3.org/ns/dcat#endpointURL',
            //     '@type': 'http://www.w3.org/2000/01/rdf-schema#Resource',
            // },
            // endpointDescription: {
            //     '@id': 'http://www.w3.org/ns/dcat#endpointDescription',
            //     '@type': 'http://www.w3.org/2000/01/rdf-schema#Resource',
            // },
            // endDate: {
            //     '@id': 'http://schema.org/endDate',
            // },
            // format: {
            //     '@id': 'http://purl.org/dc/terms/format',
            //     '@type': 'http://purl.org/dc/terms/MediaTypeOrExtent',
            // },
            // hasPart: {
            //     '@id': 'http://purl.org/dc/terms/hasPart',
            //     '@type': 'http://www.w3.org/ns/dcat#Catalog',
            // },
            // hasVersion: {
            //     '@id': 'http://purl.org/dc/terms/hasVersion',
            //     '@type': 'http://www.w3.org/ns/dcat#Dataset',
            // },
            // homepage: {
            //     '@id': 'http://xmlns.com/foaf/0.1/homepage',
            //     '@type': 'http://xmlns.com/foaf/0.1/Document',
            // },
            // identifier: {
            //     '@id': 'http://purl.org/dc/terms/identifier',
            //     '@type': 'http://www.w3.org/2001/XMLSchema#string',
            // },
            // isPartOf: {
            //     '@id': 'http://purl.org/dc/terms/isPartOf',
            //     '@type': 'http://www.w3.org/ns/dcat#Catalog',
            // },
            // issued: {
            //     '@id': 'http://purl.org/dc/terms/issued',
            // },
            // isVersionOf: {
            //     '@id': 'http://purl.org/dc/terms/isVersionOf',
            //     '@type': 'http://www.w3.org/ns/dcat#Dataset',
            // },
            // keyword: {
            //     '@id': 'http://www.w3.org/ns/dcat#keyword',
            //     '@type': 'http://www.w3.org/2000/01/rdf-schema#Literal',
            // },
            // landingPage: {
            //     '@id': 'http://www.w3.org/ns/dcat#landingPage',
            //     '@type': 'http://xmlns.com/foaf/0.1/Document',
            // },
            // language: {
            //     '@id': 'http://purl.org/dc/terms/language',
            //     '@type': 'http://purl.org/dc/terms/LinguisticSystem',
            // },
            // license: {
            //     '@id': 'http://purl.org/dc/terms/license',
            //     '@type': 'http://purl.org/dc/terms/LicenseDocument',
            // },
            // linked_schemas: {
            //     '@id': 'http://purl.org/dc/terms/conformsTo',
            //     '@type': 'http://purl.org/dc/terms/Standard',
            // },
            // mediaType: {
            //     '@id': 'http://www.w3.org/ns/dcat#mediaType',
            //     '@type': 'http://purl.org/dc/terms/MediaTypeOrExtent',
            // },
            // modified: {
            //     '@id': 'http://purl.org/dc/terms/modified',
            // },
            // name: {
            //     '@id': 'http://xmlns.com/foaf/0.1/name',
            //     '@type': 'http://www.w3.org/2001/XMLSchema#string',
            // },
            // notation: {
            //     '@id': 'http://www.w3.org/2004/02/skos/core#notation',
            //     '@type': 'http://www.w3.org/2001/XMLSchema#string',
            // },
            // other_identifier: {
            //     '@id': 'http://www.w3.org/ns/adms#identifier',
            //     '@type': 'http://www.w3.org/ns/adms#Identifier',
            // },
            // page: {
            //     '@id': 'http://xmlns.com/foaf/0.1/page',
            //     '@type': 'http://xmlns.com/foaf/0.1/Document',
            // },
            // prefLabel: {
            //     '@id': 'http://www.w3.org/2004/02/skos/core#prefLabel',
            //     '@type': 'http://www.w3.org/2001/XMLSchema#string',
            // },
            // primaryTopic: {
            //     '@id': 'http://xmlns.com/foaf/0.1/primaryTopic',
            //     '@type': 'http://www.w3.org/ns/dcat#Dataset',
            // },
            // provenance: {
            //     '@id': 'http://purl.org/dc/terms/provenance',
            //     '@type': 'http://purl.org/dc/terms/ProvenanceStatement',
            // },
            // publisher: {
            //     '@id': 'http://purl.org/dc/terms/publisher',
            //     '@type': 'http://xmlns.com/foaf/0.1/Agent',
            // },
            // creator: {
            //     '@id': 'http://purl.org/dc/terms/creator',
            //     '@type': 'http://xmlns.com/foaf/0.1/Agent',
            // },
            // contributor: {
            //     '@id': 'http://purl.org/dc/terms/contributor',
            //     '@type': 'http://xmlns.com/foaf/0.1/Agent',
            // },
            // record: {
            //     '@id': 'http://www.w3.org/ns/dcat#record',
            //     '@type': 'http://www.w3.org/ns/dcat#CatalogRecord',
            // },
            // relation: {
            //     '@id': 'http://purl.org/dc/terms/relation',
            //     '@type': 'http://www.w3.org/2000/01/rdf-schema#Resource',
            // },
            // rights: {
            //     '@id': 'http://purl.org/dc/terms/rights',
            //     '@type': 'http://purl.org/dc/terms/RightsStatement',
            // },
            // sample: {
            //     '@id': 'http://www.w3.org/ns/adms#sample',
            //     '@type': 'http://www.w3.org/ns/dcat#Distribution',
            // },
            // source: {
            //     '@id': 'http://purl.org/dc/terms/source',
            //     '@type': 'http://www.w3.org/ns/dcat#Dataset',
            // },
            // source_metadata: {
            //     '@id': 'http://purl.org/dc/terms/source',
            //     '@type': 'http://www.w3.org/ns/dcat#CatalogRecord',
            // },
            // spatial: {
            //     '@id': 'http://purl.org/dc/terms/spatial',
            //     '@type': 'http://purl.org/dc/terms/Location',
            // },
            // startDate: {
            //     '@id': 'http://schema.org/startDate',
            // },
            // status: {
            //     '@id': 'http://www.w3.org/ns/adms#status',
            //     '@type': 'http://www.w3.org/2004/02/skos/core#Concept',
            // },
            // temporal: {
            //     '@id': 'http://purl.org/dc/terms/temporal',
            //     '@type': 'http://purl.org/dc/terms/PeriodOfTime',
            // },
            // theme: {
            //     '@id': 'http://www.w3.org/ns/dcat#theme',
            //     '@type': 'http://www.w3.org/2004/02/skos/core#Concept',
            // },
            // themeTaxonomy: {
            //     '@id': 'http://www.w3.org/ns/dcat#themeTaxonomy',
            //     '@type': 'http://www.w3.org/2004/02/skos/core#ConceptScheme',
            // },
            // title: {
            //     '@id': 'http://purl.org/dc/terms/title',
            //     '@type': 'http://www.w3.org/2001/XMLSchema#string',
            // },
            // type: {
            //     '@id': 'http://purl.org/dc/terms/type',
            //     '@type': 'http://www.w3.org/2004/02/skos/core#Concept',
            // },
            // versionInfo: {
            //     '@id': 'http://www.w3.org/2002/07/owl#versionInfo',
            //     '@type': 'http://www.w3.org/2001/XMLSchema#string',
            // },
            // versionNotes: {
            //     '@id': 'http://www.w3.org/ns/adms#versionNotes',
            //     '@type': 'http://www.w3.org/2001/XMLSchema#string',
            // },
            // inSeries: {
            //     '@id': 'https://www.w3.org/ns/dcat#inSeries',
            //     '@type': 'http://www.w3.org/ns/dcat#DatasetSeries'
            // },
            // prev: {
            //     '@id': 'https://www.w3.org/ns/dcat#prev',
            //     '@type': 'http://www.w3.org/ns/dcat#DatasetSeries'
            // },
            // next: {
            //     '@id': 'https://www.w3.org/ns/dcat#next',
            //     '@type': 'http://www.w3.org/ns/dcat#DatasetSeries',
            // },
        },
    };

    // Basics
    // output['identifier'] = input['chapter'];
    let book = input['book'];
    let chapter = input['chapter'];
    let config = input['_config'];
    if (chapter) {
        do_chapter(book, chapter, config, output);
    } else if (book) {
        do_book(book, config, output);
    } else {
        do_config(config, output);
    }

    let categories = [];
    // {
    //     let dataTheme = {
    //         '@id': 'http://publications.europa.eu/resource/authority/data-theme',
    //         '@type': 'skos:ConceptScheme',
    //         'dct:title': 'Data theme',
    //     };

    //     let category = {
    //         '@id': 'http://publications.europa.eu/resource/authority/data-theme/TECH',
    //         '@type': 'skos:Concept',
    //         'skos:inScheme': dataTheme,
    //     }
    //     categories.push(category);
    // }

    // {
    //     let dataTheme = {
    //         '@id': ' http://data.europa.eu/8mn/euroscivoc/40c0f173-baa3-48a3-9fe6-d6e8fb366a00',
    //         '@type': 'skos:ConceptScheme',
    //         'dct:title': 'EuroSciVoc',
    //     };

    //     let category = {
    //         '@id': 'http://data.europa.eu/8mn/euroscivoc/14401fcb-cc47-4553-8d26-95ad6f007695',
    //         // '@type': 'skos:Concept',
    //         // 'skos:inScheme': dataTheme,
    //     }
    //     categories.push(category);
    // }

    output['dcat:theme'] = categories;
    // {
    //     output["dct:subject"] = [{
    //         "@id": "http://eurovoc.europa.eu/1460"
    //     }];
    // }
    // https://op.europa.eu/en/web/eu-vocabularies/concept-scheme/-/resource?uri=http://data.europa.eu/8mn/euroscivoc/40c0f173-baa3-48a3-9fe6-d6e8fb366a00
    // {
    //     let dataTheme = {
    //         '@id': ' http://data.europa.eu/8mn/euroscivoc/40c0f173-baa3-48a3-9fe6-d6e8fb366a00',
    //         '@type': 'skos:ConceptScheme',
    //         'dct:title': 'EuroSciVoc',
    //     };

    //     output['dct:subject'] = [{
    //         '@id': 'http://data.europa.eu/8mn/euroscivoc/14401fcb-cc47-4553-8d26-95ad6f007695',
    //         '@type': 'skos:Concept',
    //         'skos:inScheme': dataTheme,
    //     }];
    // }

    // provenance
    {
        output['dct:provenance'] = [
            {
                '@type': 'dct:ProvenanceStatement',
                'rdfs:label': "GitHub",
            }
        ];
        output["prov:wasGeneratedBy"] = [
            {
                "@type": "prov:Activity",
                "rdfs:label": "Survey on Urban Mobility 2021",
            }
        ];
    }
    return output;
}

function main() {
    const { getTestBookInput, getTestChapterInput, getTestConfigInput } = require('./quadriga-test-input.js');
    // let input = getTestBookInput();
    // let output = transforming(input);
    // console.log(JSON.stringify(output, null, 2))
    // return output;

    let input = getTestChapterInput();
    let output = transforming(input);
    console.log(JSON.stringify(output, null, 2))
    return output;

    // let input = getTestConfigInput();
    // let output = transforming(input);
    // console.log(JSON.stringify(output, null, 2))
    // return output;

}

// main()
