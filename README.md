# Portal Deployment Manager

This is the folder aimed to make development and deployment flexible across different piveau-based projects, e.g. NFDI4DS, QUADRIGA, etc.

## Quick Start (in development mode), linux and mac only
```
    mkdir -p $HOME/.cache/piveau/virtuoso-nfdi4ds
    mkdir -p $HOME/.cache/piveau/virtuoso-shadow-nfdi4ds
    mkdir -p $HOME/.cache/piveau/elasticsearch-nfdi4ds
    mkdir -p $HOME/.cache/piveau/mongo-nfdi4ds

    chmod -R 777 $HOME/.cache/piveau

    docker-compose -f production/common.yml -f production/metrics.yml -f production/nfdi4ds.yml -f development/dev.nfdi4ds-quickstart.yml up -d
    # Before running the following command, please ensure the healthy of elasticsearch service

    docker ps |grep elasticsearch  # check "healthy" in the console

    # create all possible catalogs
   ./run.sh -p nfdi4ds -c create_catalogs --skip-dry-run --dev

   # connect to piveau-consus-scheduling telnet server
   telnet localhost 15000
   > pipes # show the registered pipes
   > launch zenodo-ghga # trigger the pipe to harvest metadata from zenodo
    # Expected output
    # {
    #   "status" : "active",
    #   "pipeHeader" : {
    #     "id" : "963f71f4-0595-4a36-a444-462649ff126e",
    #     "name" : "zenodo-ghga",
    #     "title" : "Harvester - GHGA Zenodo",
    #     "version" : "2.0.0",
    #     "transport" : "payload",
    #     "runId" : "zenodo-ghga~f5e28098-a020-4992-96cf-5148961c6110",
    #     "startTime" : "2026-01-07T23:41:35.759+00:00"
    #   }
    # }

   # locate http://localhost:8080 in browser
```
## Quick Start in Window System
Run the following commands in folder **portal-deployment**
```
    docker-compose -f production/common.yml -f production/metrics.yml -f production/nfdi4ds.yml -f development/dev.nfdi4ds-quickstart.yml up -d
    # Before running the following command, please ensure the healthy of elasticsearch service

    docker ps   # check "healthy" of elasticsearch in the console

    # create catalog, ensure you are in folder portal-deployment
    curl.exe -v -XPUT -H "X-API-Key: yourRepoApiKey" -H "Content-Type: text/turtle" --data "@catalogs/nfdi4ds/zenodo-ghga.ttl" "http://127.0.0.1:8082/catalogues/zenodo-ghga"
    # check the http code is in [200,300)
   
    # connect to piveau-consus-scheduling telnet server
    # open http://localhost:8095/shell.html in browser, don't confuse with piveau-hub-repo shell, we need piveau-consus-scheduling
    > pipes # show the registered pipes
    > launch zenodo-ghga # trigger the pipe to harvest metadata from zenodo
    # Expected output
    # {
    #   "status" : "active",
    #   "pipeHeader" : {
    #     "id" : "963f71f4-0595-4a36-a444-462649ff126e",
    #     "name" : "zenodo-ghga",
    #     "title" : "Harvester - GHGA Zenodo",
    #     "version" : "2.0.0",
    #     "transport" : "payload",
    #     "runId" : "zenodo-ghga~f5e28098-a020-4992-96cf-5148961c6110",
    #     "startTime" : "2026-01-07T23:41:35.759+00:00"
    #   }
    # }

   # locate http://localhost:8080 in browser
```



## Service endpoints
  - https://quadriga.fokus.fraunhofer.de
  - https://nfdi4dsmetaportal.fokus.fraunhofer.de
  - https://nfdimetaportal.fokus.fraunhofer.de
  - https://meta4bua.fokus.fraunhofer.de


### Important directories
| Directory  | Role  |
|---|---|
| `catalogs/$project/*.tll`  | Includes ttl-files defining catalogs which can be initiated using the Hub Repo API. Please maintain catalog scripts within a repo (NFDI) |
| `pipes/$project/*.yaml`  | Contains harvesting pipeline scripts which are used by the scheduler to start a harvest run. |
| `scripts/*`  |  Contains transformation scripts which are used by transformers to convert metadata to DCAT-AP during the harvesting. |
| `production/$project/*.yml`  | Includes the docker-compose file running Piveau |
| `development/*.yml`  | Includes the docker-compose file running Piveau |
| `nginx/*.conf`  | Configuration to set up domain name and ssl, `cp /opt/dockerfiles/nginx.conf /etc/nginx/sites-available/ && ln -sf /etc/nginx/sites-available/nginx.conf /etc/nginx/sites-enabled/nginx.conf && sudo systemctl restart nginx`. For ssl, need support from steffen.konegen@fokus.fraunhofer.de |

## Trouble Shooting
   - **Failed to remove network production_default: Error response from daemon: error while removing network: network production_default id b5a131d75f2695a9bc72e96b26f57b1c8a7e9563eb46f7ee12c239f39c8a82ba has active endpoints**
    > It's due to the confliction, you should find out the service and map the port to another host port
   - **If the catalogs and metrics information are missing in `/mqa`, you can refresh the `piveau-metrics-cache`**
    > curl -X POST 'http://piveau-metrics-cache/admin/refresh' --header 'Authorization: doesnotmatter'

## Further information
* [Piveau Docu](https://doc.piveau.de/)
* [NGINX Docu](https://nginx.org/en/docs/)
* [Docker compose](https://docs.docker.com/compose/)

## NOTE
    We cannot use the latest version of `piveau-hub-search` and `piveau-hub-repo` due to issues results by `elasticsearch`. For `elasticsearch > 7.10`, we cannot start its container on ubuntu 24.04. And the maximum version of `piveau-hub-search` suppporting `elasticsearch == 7.10` is version `3.0.4`

```
*/5 * * * * PROJECT=meta4ds /usr/bin/python3 /home/nfdiuser/portal-deployment/tools/monitor-and-restart.py
30 3 * * 0 /usr/bin/python3 /home/nfdiuser/portal-deployment/tools/harvest-data.py --project nfdi4ds --skip-dry-run -a
```

## Disclaimer
Before working on the server, please let [Steffen](steffen.konegen@fokus.fraunhofer.de) know, as his monitoring systems will tell him if something is happening on the server and he will know that it is not a malicious attack
