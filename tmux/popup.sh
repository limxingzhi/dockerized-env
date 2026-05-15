#!/bin/bash
CURRENT_SESSION_NAME=$(tmux display-message -p '#S')
NEW_SESSION_NAME="scratch-${CURRENT_SESSION_NAME}"

tmux has-session -t "${NEW_SESSION_NAME}" 2>/dev/null

if [ $? != 0 ]; then
  tmux new-session -d -s "${NEW_SESSION_NAME}"
fi

tmux display-popup -E -h 90% -w 80% "tmux attach-session -t ${NEW_SESSION_NAME}; tmux refresh-client"
