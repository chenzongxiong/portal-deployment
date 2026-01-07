function preprocess(input) {
    const {
        identifier,
        description,
        forks_count,
        stargazers_count,
        watcher_count,
        html_url,
        author: authorStr,
        contributors: contributorsStr,
        license: licenseStr,
        releases: releasesStr,
        zenodojson: zenodojsonStr,
        created_at,
        updated_at,
        topics: topicsStr,
    } = input;

    const org = identifier.split("/")[0].toUpperCase();
    let authors = [];
    if (authorStr) {
        try {
            authors = JSON.parse(authorStr);
        } catch (error) {
        }
    }
    let contributors = [];
    if (contributorsStr) {
        try {
            contributors = JSON.parse(contributorsStr);
        } catch (error) {
        }
    }
    let releases = [];
    if (releasesStr) {
        try {
            releases = JSON.parse(releasesStr);
        } catch (error) {

        }
    }
    let license = null;
    if (licenseStr) {
        try {
            license = JSON.parse(licenseStr);
        } catch (error) {

        }
    }

    let topics = [];
    if (topicsStr) {
        try {
            topics = JSON.parse(topicsStr)
        } catch (error) {
        }
    }

    const zenodojson = zenodojsonStr ? JSON.parse(zenodojsonStr) : null;
    const creators = zenodojson ? zenodojson.creators : contributors;
    const keywords = zenodojson ? zenodojson.keywords : topics;
    const version = zenodojson ? zenodojson.version : null;

    return {
        identifier,
        description,
        // forks_count,
        // stargazers_count,
        // watcher_count,
        homepage: html_url,
        org,
        authors,
        contributors,
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
        identifier,
        description,
        org,
        homepage,
        // author,
        authors,
        license,
        releases,
        creators,
        contributors,
        keywords,
        version,
        created_at,
        updated_at,
    } = preprocess(input);
    // console.log("identifier: ", identifier);
    // console.log("org: ", org);
    // console.log("license: ", license);
    // console.log("homepage: ", homepage);
    // console.log("description: ", description);
    // console.log("authors: ", authors);
    // console.log("contributors: ", contributors);
    // console.log("creators: ", creators);
    // console.log("version: ", version);
    // console.log("releases: ", releases);
    // console.log('keyword: ', keywords);
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
    // output.type = {
    //     "@value": "Software",
    //     "@language": params.defaultLanguage,
    // };
    output['dct:publisher'] = {
        "@type": "foaf:Agent",
        "foaf:name": org,
    };

    output["dct:issued"] = created_at;
    output["dct:modified"] = updated_at;
    output["foaf:homepage"] = {
        "@id": encodeURI(homepage),
    };

    output["dct:license"] = [];
    if (license) {
        output["dct:license"].push({
            "@type": "dct:LicenseDocument",
            "@id": license.html_url,
            "foaf:name": license.name,
        });
    }

    output['dcat:distribution'] = [];
    if (releases.length > 0) {
        for (const release of releases) {
            const dist = {
                "@type": "dcat:Distribution",
                "dct:title": release["name"],
                "dct:description": release["body"],
                "dcat:downloadURL": release["tarball_url"],
                "dct:issued": release["published_at"],
                "dct:modified": release["published_at"],
                "dct:license": output["dct:license"],
                "dct:format": [{
                    "@id": 'http://publications.europa.eu/resource/authority/file-type/TAR_GZ',
                    "@type": "dct:MediaTypeOrExtent",
                }],
            };
            output['dcat:distribution'].push(dist);
        }
    } else if (license) {
        const dist = {
            "@type": "dcat:Distribution",
            "dct:license": output["dct:license"],
            "dct:modified": updated_at,
        };
        output['dcat:distribution'].push(dist);
    }

    output["dcat:contactPoint"] = [];
    output['dct:creator'] = [];

    for (const creator of creators) {
        output["dct:creator"].push({
            "@type": "foaf:Agent",
            "foaf:name": creator.name,
            "vcard:hasEmail": creator.email,
        });
        output["dcat:contactPoint"].push({
            "@type": "foaf:Agent",
            "vcard:fn": `${creator.name} (${creator.email})`,
            "vcard:hasEmail": creator.email,
        });
    }
    for (const author of authors) {
        output["dcat:contactPoint"].push({
            "@type": "foaf:Agent",
            "vcard:fn": `${author.name} (${author.email})`,
            "vcard:hasEmail": author.email,
        });
    }
    output['dct:contributor'] = [];
    for (const contributor of contributors) {
        output['dct:contributor'].push({
            "@type": "foaf:Agent",
            "vcard:fn": contributor.name,
            "foaf:name": contributor.name,
            "vcard:hasEmail": contributor.email,
        });
    }

    output["dcat:keyword"] = [];
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
    const {getTestInput1, getTestInput2, getTestInput3, getTestInput4} = require("./gitlab.test.js");
    const input = getTestInput4();
    const output = transforming(input);
    console.log(JSON.stringify(output));
}
// const params = {
//     defaultLanguage: "en",
//     categories: "SCIE SOCI TECH",
// };
// main()
