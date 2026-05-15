#!/bin/bash
session_name=$(tmux display-message -p '#S')
if [[ "${session_name}" != scratch-* ]]; then
  tmux has-session -t "scratch-${session_name}" 2>/dev/null && echo "* "
fi
