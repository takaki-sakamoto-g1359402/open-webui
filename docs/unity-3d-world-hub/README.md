# Minimal 3D World Hub PoC (Unity)

## 1. High-Level Design
- Three scenes: `HubScene` (central lobby), `WorldA`, and `WorldB`. Each scene contains a single `SpawnPoint` transform to drop the player on load.
- A persistent `SceneTransitionManager` (singleton, `DontDestroyOnLoad`) positions the player at the requested spawn point after every load. Portals call the manager with a target scene name and optional spawn point name. Player persistence is handled by reusing or instantiating a prefab and moving it to the correct spawn on each scene load.

## 2. Project / File Tree
```
/Assets
  /Scripts
    Portal.cs
    SceneTransitionManager.cs
  /Scenes
    HubScene.unity
    WorldA.unity
    WorldB.unity
  /Prefabs
    Player.prefab
    Portal.prefab (optional convenience)
```

## 3. Key Scripts (C#)

### Portal.cs
```csharp
using UnityEngine;

/// <summary>
/// Simple trigger-based portal that requests a scene transition via the SceneTransitionManager.
/// Place this on a GameObject with a trigger collider. When the player enters (and optionally presses a key),
/// the target scene will load and the player will spawn at the named spawn point.
/// </summary>
[RequireComponent(typeof(Collider))]
public class Portal : MonoBehaviour
{
    [Tooltip("Scene name to load when the portal is activated (must be in Build Settings).")]
    public string targetSceneName;

    [Tooltip("Name of the spawn point in the target scene. Defaults to 'SpawnPoint'.")]
    public string targetSpawnPointName = "SpawnPoint";

    [Tooltip("If true, player must press the interaction key while inside the trigger.")]
    public bool requireInteraction = true;

    [Tooltip("Key used to activate the portal when interaction is required.")]
    public KeyCode interactionKey = KeyCode.E;

    private bool _playerInside;

    private void Reset()
    {
        // Ensure the collider is marked as a trigger so the portal can be activated by overlap.
        var col = GetComponent<Collider>();
        col.isTrigger = true;
    }

    private void OnTriggerEnter(Collider other)
    {
        if (!other.CompareTag("Player")) return;
        _playerInside = true;

        if (!requireInteraction)
        {
            ActivatePortal();
        }
    }

    private void OnTriggerExit(Collider other)
    {
        if (!other.CompareTag("Player")) return;
        _playerInside = false;
    }

    private void Update()
    {
        if (!requireInteraction || !_playerInside) return;

        if (Input.GetKeyDown(interactionKey))
        {
            ActivatePortal();
        }
    }

    private void ActivatePortal()
    {
        if (string.IsNullOrEmpty(targetSceneName))
        {
            Debug.LogWarning($"Portal on {name} has no target scene assigned.");
            return;
        }

        SceneTransitionManager.Instance?.TransitionToScene(targetSceneName, targetSpawnPointName);
    }

    private void OnDrawGizmos()
    {
        // Draw a simple line to visualize where the portal will send the player.
        Gizmos.color = Color.cyan;
        Gizmos.DrawWireCube(transform.position, Vector3.one);
    }
}
```

### SceneTransitionManager.cs
```csharp
using System;
using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;

/// <summary>
/// Lightweight singleton that persists across scene loads and keeps the player anchored to scene spawn points.
/// Add this to a bootstrap GameObject (e.g., "TransitionManager") in the starting scene and assign the player prefab.
/// </summary>
public class SceneTransitionManager : MonoBehaviour
{
    public static SceneTransitionManager Instance { get; private set; }

    [Tooltip("Player prefab to spawn if one is not present in the scene.")]
    public GameObject playerPrefab;

    [Tooltip("Fallback spawn point name when no explicit name is provided by a portal.")]
    public string defaultSpawnPointName = "SpawnPoint";

    private string _nextSpawnPointName;
    private GameObject _playerInstance;
    private bool _isLoading;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }

        Instance = this;
        DontDestroyOnLoad(gameObject);
        _nextSpawnPointName = defaultSpawnPointName;
    }

    private void OnEnable()
    {
        SceneManager.sceneLoaded += OnSceneLoaded;
    }

    private void OnDisable()
    {
        SceneManager.sceneLoaded -= OnSceneLoaded;
    }

    /// <summary>
    /// Request a scene change to the given scene. The player will be placed at the named spawn point in the target scene.
    /// </summary>
    public void TransitionToScene(string sceneName, string spawnPointName = null)
    {
        if (_isLoading) return;

        _nextSpawnPointName = string.IsNullOrWhiteSpace(spawnPointName)
            ? defaultSpawnPointName
            : spawnPointName;

        StartCoroutine(LoadSceneRoutine(sceneName));
    }

    private IEnumerator LoadSceneRoutine(string sceneName)
    {
        _isLoading = true;
        AsyncOperation load = SceneManager.LoadSceneAsync(sceneName);
        while (!load.isDone)
        {
            yield return null;
        }
        _isLoading = false;
    }

    private void OnSceneLoaded(Scene scene, LoadSceneMode mode)
    {
        MovePlayerToSpawn();
    }

    private void MovePlayerToSpawn()
    {
        // Try to find an existing player tagged "Player" if one was placed in the scene.
        if (_playerInstance == null)
        {
            _playerInstance = GameObject.FindGameObjectWithTag("Player");
        }

        // Otherwise, instantiate the assigned prefab.
        if (_playerInstance == null && playerPrefab != null)
        {
            _playerInstance = Instantiate(playerPrefab);
            _playerInstance.name = "Player";
        }

        if (_playerInstance == null)
        {
            Debug.LogWarning("SceneTransitionManager could not find or create a player instance.");
            return;
        }

        Transform spawn = FindSpawnPoint(_nextSpawnPointName);
        if (spawn == null)
        {
            Debug.LogWarning($"No spawn point found matching '{_nextSpawnPointName}'.");
            return;
        }

        // Safely reposition character controllers.
        CharacterController controller = _playerInstance.GetComponent<CharacterController>();
        if (controller != null)
        {
            controller.enabled = false;
        }

        _playerInstance.transform.SetPositionAndRotation(spawn.position, spawn.rotation);

        if (controller != null)
        {
            controller.enabled = true;
        }
    }

    private Transform FindSpawnPoint(string spawnName)
    {
        // First look for objects tagged as SpawnPoint with a matching name.
        GameObject[] tagged = GameObject.FindGameObjectsWithTag("SpawnPoint");
        foreach (GameObject go in tagged)
        {
            if (string.Equals(go.name, spawnName, StringComparison.OrdinalIgnoreCase))
            {
                return go.transform;
            }
        }

        // Then try to find a named object in the scene.
        GameObject named = GameObject.Find(spawnName);
        if (named != null) return named.transform;

        // Fallback to the first tagged spawn point if none matched.
        if (tagged.Length > 0) return tagged[0].transform;

        return null;
    }
}
```

## 4. Setup Instructions
- Create three scenes: `HubScene`, `WorldA`, `WorldB`.
- In each scene, add an empty GameObject named `SpawnPoint`, give it the tag `SpawnPoint`, and position/rotate it where the player should appear.
- Create a `Player` prefab (Character Controller + simple camera rig). Tag the root as `Player`.
- In `HubScene`, add an empty GameObject named `TransitionManager` and attach `SceneTransitionManager`. Assign the `Player` prefab to `playerPrefab` and set `defaultSpawnPointName` to `SpawnPoint`.
- Add two portal objects in `HubScene` with a trigger collider and the `Portal` script:
  - `PortalToWorldA`: `targetSceneName = "WorldA"`, `targetSpawnPointName = "SpawnPoint"`.
  - `PortalToWorldB`: `targetSceneName = "WorldB"`, `targetSpawnPointName = "SpawnPoint"`.
- In `WorldA` and `WorldB`, add a `PortalBackToHub` with a trigger collider and the `Portal` script: `targetSceneName = "HubScene"`, `targetSpawnPointName = "SpawnPoint"`.
- (Optional) Set `requireInteraction` to `false` for auto-enter portals, or leave it `true` to require pressing `E` while inside.
- Open **Build Settings** and add `HubScene`, `WorldA`, and `WorldB` in that order. Ensure `HubScene` is at index 0 (the first scene).
- Press Play from `HubScene` to test: walk into/press `E` at the portals to jump between scenes, and you should appear at each scene's `SpawnPoint`.
