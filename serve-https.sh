#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
runtime_dir="$project_dir/storage/app/private/nginx-https"
certificate_dir="$runtime_dir/certs"
configuration_template="$project_dir/nginx.https.conf"
configuration_file="nginx.conf"
action="${1:-start}"
https_host="${2:-192.168.111.160}"

require_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        echo "Perintah '$1' belum tersedia." >&2
        exit 1
    fi
}

prepare_runtime() {
    mkdir -p \
        "$certificate_dir" \
        "$runtime_dir/logs" \
        "$runtime_dir/temp/client_body" \
        "$runtime_dir/temp/proxy"

    cp "$configuration_template" "$runtime_dir/$configuration_file"
}

generate_certificate() {
    require_command mkcert

    mkcert \
        -cert-file "$certificate_dir/smart-perkemi.pem" \
        -key-file "$certificate_dir/smart-perkemi-key.pem" \
        "$https_host" localhost 127.0.0.1 ::1

    chmod 600 "$certificate_dir/smart-perkemi-key.pem"
}

nginx_command() {
    nginx -p "$runtime_dir/" -c "$configuration_file" -e "$runtime_dir/logs/error.log" "$@"
}

is_running() {
    local pid_file="$runtime_dir/logs/nginx.pid"

    [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null
}

start_proxy() {
    require_command nginx
    prepare_runtime
    generate_certificate
    nginx_command -t

    if is_running; then
        nginx_command -s reload
        echo "HTTPS lokal dimuat ulang: https://$https_host:8443"
    else
        nginx_command
        echo "HTTPS lokal aktif: https://$https_host:8443"
    fi

    echo "Laravel harus tetap berjalan di http://127.0.0.1:8000."
    echo "Root CA untuk ponsel: $(mkcert -CAROOT)/rootCA.pem"
}

stop_proxy() {
    require_command nginx

    if is_running; then
        nginx_command -s stop
        echo "HTTPS lokal dihentikan."
    else
        echo "HTTPS lokal tidak sedang berjalan."
    fi
}

case "$action" in
    start)
        start_proxy
        ;;
    restart)
        stop_proxy
        start_proxy
        ;;
    stop)
        stop_proxy
        ;;
    status)
        if is_running; then
            echo "HTTPS lokal aktif: https://$https_host:8443"
        else
            echo "HTTPS lokal tidak sedang berjalan."
            exit 1
        fi
        ;;
    *)
        echo "Penggunaan: ./serve-https.sh [start|restart|stop|status] [alamat-ip]" >&2
        exit 1
        ;;
esac
