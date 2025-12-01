#!/bin/bash

# Read JSON from stdin
data=$(cat)

# Debug: write data to temp file
echo "$data" > /tmp/statusline-debug.json 2>/dev/null

# Extract values
transcript=$(echo "$data" | grep -o '"transcript_path":"[^"]*"' | cut -d'"' -f4)
model=$(echo "$data" | grep -o '"display_name":"[^"]*"' | cut -d'"' -f4)
session_cost=$(echo "$data" | grep -o '"total_cost_usd":[0-9.]*' | cut -d':' -f2 | head -1)

# Get git info
branch=$(git branch --show-current 2>/dev/null)
modified=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
added=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
untracked=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')

# Color branch and git stats
branch_colored="\033[44m\033[97m ${branch} \033[0m"
git_stats="\033[48;5;39m\033[30m M:$modified A:$added ?:$untracked \033[0m"

# Get token usage from transcript
tokens=""
api_usage=""

if [[ -n "$transcript" && -f "$transcript" ]]; then
  # Get last assistant message with usage
  last_usage=$(tail -100 "$transcript" 2>/dev/null | grep '"usage"' | tail -1)

  if [[ -n "$last_usage" ]]; then
    # Extract all input token types
    base_input=$(echo "$last_usage" | grep -o '"input_tokens":[0-9]*' | cut -d':' -f2)
    cache_create=$(echo "$last_usage" | grep -o '"cache_creation_input_tokens":[0-9]*' | cut -d':' -f2)
    cache_read=$(echo "$last_usage" | grep -o '"cache_read_input_tokens":[0-9]*' | cut -d':' -f2)

    # Default to 0 if not found
    base_input=${base_input:-0}
    cache_create=${cache_create:-0}
    cache_read=${cache_read:-0}

    # Total input tokens
    input_tokens=$((base_input + cache_create + cache_read))

    if [[ "$input_tokens" -gt 0 ]]; then
      # Set limits
      if [[ "$model" == *"Sonnet 4.5"* ]]; then
        limit=1000000
        compact_threshold=800000
      else
        limit=200000
        compact_threshold=160000
      fi

      pct=$((input_tokens * 100 / limit))
      remaining=$((limit - input_tokens))
      compact_pct=$((100 - (input_tokens * 100 / compact_threshold)))

      # Add commas to numbers
      input_fmt=$(printf "%'d" $input_tokens 2>/dev/null || echo $input_tokens)
      remaining_fmt=$(printf "%'d" $remaining 2>/dev/null || echo $remaining)

      # Color based on percentage: green->yellow->red
      if [[ $pct -lt 50 ]]; then
        color="\033[42m\033[30m"  # green bg, black text
      elif [[ $pct -lt 75 ]]; then
        color="\033[43m\033[30m"  # yellow bg, black text
      elif [[ $pct -lt 90 ]]; then
        color="\033[48;5;208m\033[30m"  # orange bg, black text
      else
        color="\033[41m\033[97m"  # red bg, white text
      fi
      reset="\033[0m"

      # Format: used/remaining (pct%) compaction%↓
      tokens="${color}${input_fmt}/${remaining_fmt} - Reset:(${pct}%)${reset} - Compact:${compact_pct}%↓"
    fi
  fi

  # Session cost & message count
  if [[ -n "$session_cost" ]]; then
    cost_rounded=$(printf "%.2f" $session_cost 2>/dev/null || echo $session_cost)
    api_usage="\$${cost_rounded}"
  fi

  msg_count=$(grep -c '"type":"assistant"' "$transcript" 2>/dev/null)
  if [[ -n "$msg_count" ]]; then
    api_usage="${api_usage} (${msg_count}msg)"
  fi
fi

# Model shorthand
model_short=$(echo "$model" | sed 's/Claude //' | sed 's/ 4.5/4.5/' | sed 's/ 4/4/')

# Current time
time=$(date +"%H:%M")

# Output
if [ -n "$branch" ]; then
  echo -e "$time | ${branch_colored}${git_stats} | $model_short - ${tokens} - ${api_usage}"
fi

