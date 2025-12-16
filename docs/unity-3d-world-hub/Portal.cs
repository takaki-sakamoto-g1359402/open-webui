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
