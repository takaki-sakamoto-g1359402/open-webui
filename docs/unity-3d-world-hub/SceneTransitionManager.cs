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
