function preprocess(input) {
    const {
        identifier,
        description,
        forks_count,
        stargazers_count,
        watcher_count,
        html_url,
        author: authorStr,
        license: licenseStr,
        releases: releasesStr,
        zenodojson: zenodojsonStr,
        created_at,
        updated_at,
    } = input;

    const org = identifier.split("/")[0].toUpperCase();
    const author = JSON.parse(authorStr);
    const releases = releasesStr ? JSON.parse(releasesStr) : null;
    const license = licenseStr ? JSON.parse(licenseStr) : null;
    const zenodojson = zenodojsonStr ? JSON.parse(zenodojsonStr) : null;

    const creators = zenodojson
        ? zenodojson.creators
        : [
            {
                name: author.login,
            },
        ];
    const keywords = zenodojson ? zenodojson.keywords : [];
    const version = zenodojson ? zenodojson.version : null;

    return {
        org,
        identifier,
        description,
        // forks_count,
        // stargazers_count,
        // watcher_count,
        homepage: html_url,
        author,
        license,
        releases,
        creators,
        keywords,
        version,
        created_at,
        updated_at,
    };
}
function transforming(input) {
    console.log(JSON.stringify(input));
    const {
        org,
        identifier,
        description,
        // forks_count,
        // stargazers_count,
        // watcher_count,
        homepage,
        author,
        license,
        releases,
        creators,
        keywords,
        version,
        created_at,
        updated_at,
    } = preprocess(input);

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

    output["@type"] = "dcat:Dataset";
    output["dct:title"] = {
        "@value": identifier,
        "@language": params.defaultLanguage,
    };
    output["dct:description"] = {
        "@value": description,
        "@language": params.defaultLanguage,
    };
    output["dct:type"] = {
        "@value": "Software",
        "@language": params.defaultLanguage,
    };
    if (author.login) {
        output["dct:publisher"] = {
            "@type": "foaf:Agent",
            "foaf:name": author.login,
        };
    } else {
        output["dct:publisher"] = {
            "@type": "foaf:Agent",
            "foaf:name": org

        };
    }
    output["dct:issued"] = created_at;
    output["dct:modified"] = updated_at;
    // output.accessRights = "Public";
    output["foaf:homepage"] = {
        "@id": encodeURI(homepage),
    };

    output["dct:license"] = [];
    if (license) {
        output["dct:license"].push({
            "@type": "LicenseDocument",
            identifier: license.spdx_id,
            title: license.name,
            // "@id": license.url,
            "@id": `https://raw.githubusercontent.com/${identifier}/main/LICENSE`,
        });
    }

    output["dcat:distribution"] = [];
    if (releases.length > 0) {
        for (const release of releases) {
            const dist = {
                "@type": "dcat:Distribution",
                "dct:title": release["name"],
                "dct:description": release["body"],
                "dcat:downloadURL": release["tarball_url"],
                "dct:license": output["dct:license"],
                "dct:issued": release["published_at"],
                "dct:modified": release["published_at"],
                "dct:format": [{
                    "@id": 'http://publications.europa.eu/resource/authority/file-type/TAR_GZ',
                    "@type": "dct:MediaTypeOrExtent",
                }],
            };
            output['dcat:distribution'].push(dist);
        }
    } else if (license) {
        const dist = {
            "@type": "dct:Distribution",
            "dct:license": output["dct:license"],
            "dct:modified": updated_at,
        };
        output['dcat:distribution'].push(dist);
    }

    let addedContactPoint = [];
    output["dcat:contactPoint"] = [{
        "@type": "foaf:Agent",
        "vcard:fn": author.login,
    }];
    addedContactPoint.push(author.login);

    output['dct:creator'] = [];

    // output.contactPoint = [
    //     {
    //         "@type": "Kind",
    //         "http:www.w3.org/2006/vcard/ns#fn": author.login,
    //         // name: author.login,
    //     },
    // ];
    for (const creator of creators) {
        if (!addedContactPoint.includes(creator.name)) {
            output["dcat:contactPoint"].push({
                "@type": "foaf:Agent",
                "vcard:fn": creator.name,
            });
            addedContactPoint.push(creator.name);
        }
    }

    output["dcat:keyword"] = [
        // {
        //     "@value": "Software",
        //     // "@language": params.defaultLanguage,
        // },
    ];
    for (const keyword of keywords) {
        output["dcat:keyword"].push(keyword);
    }

    output['dcat:landingPage'] = {
        "@type": "foaf:Document",
        "@id": input['html_url'],
    }
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
    output['dcat:theme'] = categories;

    return output;
}

function main() {
    const {getTestInput1, getTestInput2, getTestInput3, getTestInput4} = require("./github.test.js");
    const input = getTestInput1();
    const output = transforming(input);
    console.log(JSON.stringify(output));
}
// const params = {
//     defaultLanguage: "en",
//     categories: "SCIE SOCI TECH",
// };
// main()
