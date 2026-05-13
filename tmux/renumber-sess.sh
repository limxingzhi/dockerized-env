#!/bin/bash
sessions=$(tmux list-sessions -F '#S' | grep '^[0-9]\+$' | sort -n)

new=1
for old in $sessions; do
    if [ "$old" -ne "$new" ]; then
        if ! tmux has-session -t "$new" 2>/dev/null; then
            tmux rename-session -t "$old" "$new"
        fi
    fi
    new=$((new+1))
done
