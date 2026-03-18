from __future__ import annotations


def bootstrap_token(client):
    response = client.post('/api/v1/auth/bootstrap')
    assert response.status_code == 200
    return response.json()['access_token']


def auth_headers(token: str) -> dict[str, str]:
    return {'Authorization': f'Bearer {token}'}


def test_space_agent_task_flow(client) -> None:
    token = bootstrap_token(client)

    users_response = client.get('/api/v1/users', headers=auth_headers(token))
    assert users_response.status_code == 200
    assert users_response.json()[0]['email'] == 'admin@realitybridge.local'

    space_response = client.post(
        '/api/v1/spaces',
        headers=auth_headers(token),
        json={'name': 'mission-control', 'description': 'Primary coordination', 'metadata': {'region': 'sim-us'}},
    )
    assert space_response.status_code == 201
    space_id = space_response.json()['id']

    agent_response = client.post(
        '/api/v1/agents',
        headers=auth_headers(token),
        json={'name': 'navigator-agent', 'description': 'Coordinates flows', 'capabilities': {'skills': ['route']}, 'metadata': {'tier': 'assistant'}},
    )
    assert agent_response.status_code == 201
    agent_id = agent_response.json()['id']

    task_response = client.post(
        '/api/v1/tasks',
        headers=auth_headers(token),
        json={
            'agent_id': agent_id,
            'space_id': space_id,
            'kind': 'task.coordinate',
            'description': 'Prepare handoff',
            'payload': {'risk': 2},
            'sensitive': False,
        },
    )
    assert task_response.status_code == 201
    task_id = task_response.json()['id']

    process_response = client.post(f'/api/v1/tasks/{task_id}/process', headers=auth_headers(token))
    assert process_response.status_code == 200
    assert process_response.json()['state'] == 'completed'

    decisions_response = client.get('/api/v1/policies/decisions', headers=auth_headers(token))
    assert decisions_response.status_code == 200
    assert decisions_response.json()[0]['outcome'] == 'approved'


def test_sensitive_task_is_denied(client) -> None:
    token = bootstrap_token(client)
    agent_response = client.post(
        '/api/v1/agents',
        headers=auth_headers(token),
        json={'name': 'safety-agent', 'description': 'Safety checks'},
    )
    agent_id = agent_response.json()['id']

    task_response = client.post(
        '/api/v1/tasks',
        headers=auth_headers(token),
        json={
            'agent_id': agent_id,
            'kind': 'device.physical',
            'description': 'Try physical move',
            'payload': {'risk': 8, 'device_id': 'robot-1'},
            'sensitive': True,
        },
    )
    task_id = task_response.json()['id']

    process_response = client.post(f'/api/v1/tasks/{task_id}/process', headers=auth_headers(token))
    assert process_response.status_code == 200
    assert process_response.json()['state'] == 'denied'
