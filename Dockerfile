# syntax=docker/dockerfile:1
FROM ros:humble-ros-base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3-venv \
        python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace/swarm_ew

COPY requirements.txt requirements.txt
RUN python3 -m venv /opt/swarm-ew-venv \
    && /opt/swarm-ew-venv/bin/pip install --upgrade pip \
    && /opt/swarm-ew-venv/bin/pip install -r requirements.txt

COPY packages packages
COPY src src
COPY docs docs
COPY Makefile Makefile
COPY README.md README.md
COPY .pre-commit-config.yaml .pre-commit-config.yaml

# Placeholder build step for future milestones.
RUN . /opt/ros/humble/setup.sh \
    && colcon build --packages-select "ew_*" || true

CMD ["/bin/bash"]
