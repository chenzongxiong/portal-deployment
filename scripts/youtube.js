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
        }
    };

    // Basics
    output["@type"] = "dcat:Dataset";

    let video = input;
    if (typeof input === 'string') {
        video = JSON.parse(input);
    }

    output['dct:publisher'] = {
        "@type": "foaf:Agent",
        "foaf:name": video.snippet.videoOwnerChannelTitle,
    };

    const videoId = video.contentDetails.videoId;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    output["dct:title"] = {
        "@value": video.snippet.title,
        "@language": params.defaultLanguage,
    }
    output["dct:description"] = {
        "@value": video.snippet.description,
        "@language": params.defaultLanguage,
    };
    output["dct:issued"] = video.snippet.publishedAt;
    output["dct:modified"] = video.snippet.publishedAt;
    // output["identifier"] = videoId;
    output["dcat:accessURL"] = videoUrl;
    let format = [{
        "@id": 'http://publications.europa.eu/resource/authority/file-type/HTML',
        "@type": "dct:MediaTypeOrExtent",
    }];
    output["schmea:thumbnailUrl"] = video.snippet.thumbnails.default.url;

    output["dcat:distribution"] = [{
        "@type": "dcat:Distribution",
        "dct:title": video.snippet.title,
        "dc:description": video.snippet.description,
        "dct:issued": video.snippet.publishedAt,
        "dct:modified": video.snippet.publishedAt,
        // "identifier": videoId,
        // The accessURL is the public URL where the video is accessible
        "dcat:accessURL": videoUrl,
        // Format could be considered "text/html" since it's a web video page
        "dct:format": format,
        "schmea:thumbnailUrl": video.snippet.thumbnails.default.url,
    }];

    output['dcat:landingPage'] = {
        "@type": "foaf:Document",
        "@id": videoUrl,
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
