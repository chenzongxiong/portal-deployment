# DCAT Converter
The project converts the oai_dc formatted meta data into dcat_ap format and save them in rdf format.


## Project Folder Structure
````xml
.
├── LICENSE
├── README.md
├── configs --> all the config.ini files of the repositories.
├── config.ini
├── data
│   └── sample.rdf
├── requirements.txt
└── src
    ├── converter_service.py
    ├── data_crawler.py
    ├── dcat_ap.py
    └── utils.py
````

## Config File


````yaml
[PATH]
# data will be saved in json format after running data_crawler
input_path=data/hu_berlin.json
[RDF]
#RDF files will be saved here after running converter_service
data_output=data/hu_berlin
[REPOSITORY]
# HU Berlin edoc
repository_name=HU Berlin edoc
repository_URI=https://edoc.hu-berlin.de/
[CRAWLER]
# Repository API URL
api_url=https://edoc.hu-berlin.de/oai/request/?verb=ListRecords&resumptionToken=oai_dc////
offset_count=100
# HU Berlin end_number=29320 check from api url
end_number=29320
[CONVERTER]
##split size. Each RDF will have this number of data
split_size=10000

````


## Run
* Create a conda environment

```
$ conda create -n dcat_env python=3.9
```

* Activate enviroment

```
$ conda activate dcat_env
```
* Install Requirements

```
pip install -r requirements.txt
```

*  ```config_reponame.ini``` has the specific data crawling parameters.
First copy the config file of the repository into ```config.ini``` for a repository that you would like to work.
Then, run the steps below for only one repository.
After finishing the steps, repeat them for other repository.

## 1. Change the config.ini
* copy the config_reponame's content into ```config.ini``` for the repository

## 2. Data Collection

  
* Run the scprit below:
``` 
python src/data_crawler.py
```

## 3. Converter
* Run the script below:
```
python src/converter_service.py
```

## 4. Repository APIs
* 1.) Refubium Repository

```
https://refubium.fu-berlin.de/oai/dnb?verb=ListRecords&resumptionToken=xMetaDissPlus////
```

* 2.) Depositonce Repository

```
https://api-depositonce.tu-berlin.de/server/oai/request?verb=ListRecords&resumptionToken=oai_dc////
```
* 3.) Edoc Repository

```
https://edoc.hu-berlin.de/oai/request/?verb=ListRecords&resumptionToken=oai_dc////
```

* Note:Poster paper from the project has been submitted and waiting for the review, so we will update the readme later. The project will be released, so the repository was updated.
