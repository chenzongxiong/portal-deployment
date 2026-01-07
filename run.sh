#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[1;32m'
ORANGE='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

error() {
    echo -e "${RED} ❌ ERROR: $1${NC}"
}
success() {
    echo -e "${GREEN} ✅ SUCCESS: $1${NC}"
}
warn() {
    echo -e "${CYAN}WARNING: $1${NC}"
}


# Get the docker compose version
VERSION_STRING=$(docker compose version --short)  # Extracts version only (e.g., 2.33.1)
# https://docs.docker.com/reference/compose-file/merge/#replace-value
REQUIRED_VERSION="2.24.4"
# Compare versions
if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$VERSION_STRING" | sort -V | head -n1)" = "$REQUIRED_VERSION" ] && [ "$VERSION_STRING" != "$REQUIRED_VERSION" ]; then
    echo "Docker Compose version ($VERSION_STRING) is greater than $REQUIRED_VERSION"
else
    error "Docker Compose version ($VERSION_STRING) is NOT greater than $REQUIRED_VERSION, please upgrade to a later version"
    exit 1
fi

if [[ "$(uname)" == "Darwin" ]]; then
    export DOCKER_BUILDKIT=1
    export COMPOSE_DOCKER_CLI_BUILD=1
    export DOCKER_DEFAULT_PLATFORM=linux/amd64
fi

DEV_MODE=0
COMMAND=
PROJECT=
## For docker compose
SERVICE=
## For harvesting dataset
SKIP_DRY_RUN=0
PIPES=()
## For create catalogs
PIVEAU_REPO_HOST=localhost
PIVEAU_REPO_PORT=8082
PIVEAU_REPO_API_KEY="yourRepoApiKey"
PIVEAU_SCHED_HOST=localhost
PIVEAU_SCHED_PORT=8090

show_help() {
    echo "Usage $0 [-p $project] [-s $service] [-c $command] [--dev]"
    echo
    echo "Options:"
    echo "  -p | --project      Set the project: nfdi4ds, quadriga, nfdi4cat, bop"
    echo "  -s | --service      The service to run in the docker compose file"
    echo "  -c | --command      Docker compose command, e.g. up, down, stop, pull, restart, ps, harvest, create_catalogs"
    echo "  -d | --dataset      Dataset to harvest, see the files in pipes/\$project/*.yaml"
    echo "  --skip-dry-run      Dry run the harvesting"
    echo "  --dev               Run in development mode or not, by defaut, running in development mode (no arugment)"
    echo "  -h | --help         Show this help"

}

is_empty() {
    if [[ -z $2 ]]; then
        error "Missing value for option *$1*"
        show_help
        exit 1
    fi
}
while [[ "$1" != "" ]]; do
    case "$1" in
        -p | --project )
            shift;
            is_empty "project" $1
            PROJECT=$1
            ;;
        -s | --service )
            shift;
            is_empty "service" $1
            SERVICE=$1 ;;
        -c | --command )
            shift;
            is_empty "command" $1
            COMMAND=$1 ;;
        -d | --dataset )
            shift;
            is_empty "dataset" $1
            PIPES+=("$1") ;;
        --dev ) DEV_MODE=1 ;;
        --skip-dry-run ) SKIP_DRY_RUN=1 ;;
        -h | --help )
            show_help
            exit 0
            ;;
        * ) echo "Unknown option: $1"
            show_help
            exit 1 ;;
    esac
    shift
done

up() {
    docker compose $DC_FILES up $SERVICE -d
}

restart() {
    if [[ -z $SERVICE ]]; then
        echo "Please specify the service you want to restart"
    fi
    docker compose $DC_FILES restart $SERVICE
}

stop() {
    docker compose $DC_FILES stop
}

down() {
    docker compose $DC_FILES down
}

pull() {
    docker compose $DC_FILES pull
}

ps() {
    docker compose $DC_FILES ps
}
cleanup() {
    docker ps -a -q|xargs -I cid docker rm cid
    docker images | grep "<none>" | grep -v grep | awk '{print $3}' | xargs -I img_id docker rmi img_id
    warn "*NOTE* If you are running in devlopment mode, you may need clean up the volume and network interface to ensure a clean local environment."
}

harvest() {
    echo "Execute harvest ..."
    local project=$1
    local pipes=("${PIPES[@]}")
    local skip_dry_run=$SKIP_DRY_RUN

    for pipe in ${pipes[@]}; do
        if [[ "$pipe" == "all" ]]; then
            pipes=`find pipes/"$project" -type f | sed -E "s|pipes/${project}/pipe-(.*)\.yaml|\1|" | tr '\n' ' '`
            break
        fi
    done

    for pipe in ${pipes[@]}; do
        if [[ $skip_dry_run -eq 1 ]]; then
            echo "Harvesting dataset $pipe"
            curl -i -XPUT -H 'Content-Type: application/json' \
                 --data '{"status": "enabled", "id": "immediateTrigger"}' \
                 "http://$PIVEAU_SCHED_HOST:$PIVEAU_SCHED_PORT/pipes/$pipe/triggers/immediateTrigger"
            sleep 1
        else
            echo "[DryRun] Harvesting dataset $pipe"
        fi
    done
}

create_catalogs() {
    echo "Execute create catalogs ..."
    local project=$PROJECT
    # local catalogs=`find catalogs/$project -type f | sed -E "s|(.*)|\1|" | tr '\n' ' '`
    local catalogs=`find catalogs/$project -type f`
    local url=http://$PIVEAU_REPO_HOST:$PIVEAU_REPO_PORT/catalogues
    echo $url
    for file_path in ${catalogs[@]}; do
        catalog=$(echo -n $file_path | sed -E "s|catalogs/$project/(.*).ttl|\1|")
        response=$(curl -s -o /dev/null -w "%{http_code}" -XPUT -H "X-API-Key: $PIVEAU_REPO_API_KEY" -H "Content-Type: text/turtle" --data "@$file_path" "$url/$catalog")
        if [[ $response -ge 200 && $response -lt 300 ]]; then
            echo "Created new catalogue: $catalog"
        else
            echo "Failed to create catalogue: $catalog"
        fi
        sleep 0.1
    done
}

ENV_FILE=".env"
write_env() {
    cat <<EOF > $ENV_FILE
PROJECT=$PROJECT
DEV_MODE=$DEV_MODE
EOF
}

remove_env() {
    rm -f $ENV_FILE
}

is_project_valid() {
    local project=$1
    case "$project" in
        nfdi4ds|quadriga|nfdi4cat|bop) ;;
        *)
            show_help
            exit 1
            ;;
    esac
}

if [[ "$COMMAND" == "up" ]]; then
    is_project_valid $PROJECT
else
    # If the command is not `up`, we read the project and related information from configuration stored in the env file
    if [[ -f "$ENV_FILE" ]]; then
        source $ENV_FILE
    elif [[ -z "$PROJECT" ]]; then
        echo "No $ENV_FILE found, please run with option \`-p \$project\` or \`-p \$project -d\` to ensure the correctness"
        exit 1
    else
        is_project_valid $PROJECT
    fi
fi

DC_FILES=
if [[ $DEV_MODE -eq 1 ]]; then
    DC_FILES="-f ./production/common.yml -f ./production/$PROJECT.yml -f ./development/dev.yml"
else
    DC_FILES="-f ./production/common.yml -f ./production/$PROJECT.yml"
fi

# Define headers
printf "%-30s %-50s\n" "Option"    "Value"
printf "%-30s %-50s\n" "------------------------"    "---------------------------------------------------"
printf "%-30s %-50s\n" "project"  "$PROJECT"
printf "%-30s %-50s\n" "service"  "$SERVICE"
printf "%-30s %-50s\n" "command"  "$COMMAND"
printf "%-30s %-50s\n" "dev mode"  "$DEV_MODE"
printf "%-30s %-50s\n" "skip dryrun"  "$SKIP_DRY_RUN"
printf "%-30s %-50s\n" "pipes"  `echo "${PIPES[@]}" | sed 's/ /,/g'`
printf "%-30s %-50s\n" "Docker Compose Files" "$DC_FILES"
printf "%-30s %-50s\n" "DOCKER_DEFAULT_PLATFORM" "$DOCKER_DEFAULT_PLATFORM"
printf "%-30s %-50s\n" "DOCKER_BUILDKIT" "$DOCKER_BUILDKIT"
printf "%-30s %-50s\n" "------------------------"    "---------------------------------------------------"
read -p "Do you want to continue? (y/n) " answer

if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
    exit 1
fi


if [[ "$COMMAND" == "up" ]]; then
    up
    write_env
elif [[ "$COMMAND" == "down" ]]; then
    down
elif [[ "$COMMAND" == "stop" ]]; then
    stop
elif [[ "$COMMAND" == "restart" ]]; then
    restart
elif [[ "$COMMAND" == "pull" ]]; then
    pull
elif [[ "$COMMAND" == "ps" ]]; then
    ps
elif [[ "$COMMAND" == "harvest" ]]; then
    harvest
elif [[ "$COMMAND" == "create_catalogs" ]]; then
    create_catalogs $PROJECT
elif [[ "$COMMAND" == "cleanup" ]]; then
    cleanup
fi
