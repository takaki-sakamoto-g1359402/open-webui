#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace FounderVerse.BuildTools
{
    /// <summary>
    /// Drop-in Unity Editor build automation for FounderVerse WebGL alpha builds.
    /// Copy this file into a Unity project under Assets/Editor, then call:
    /// Unity -batchmode -quit -projectPath <project> -executeMethod FounderVerse.BuildTools.FounderVerseWebGLBuild.BuildWebGL
    /// </summary>
    public static class FounderVerseWebGLBuild
    {
        private const string DefaultOutputPath = "Build/WebGL";
        private const string DefaultProductName = "FounderVerse MVP Demo";
        private const string StableHeadersFileName = "_headers";

        private static readonly string[] ExpectedSceneNameHints =
        {
            "Boot",
            "Entrance",
            "Founder",
            "Investor",
            "Builder",
            "Admin"
        };

        [MenuItem("FounderVerse/Build/WebGL Alpha Build")]
        public static void BuildWebGL()
        {
            var options = BuildOptionsFromCommandLine();
            ConfigureWebGLPlayer(options);

            var scenes = GetEnabledScenes();
            ValidateSceneCoverage(scenes);

            var outputPath = NormalizeProjectRelativePath(options.OutputPath);
            Directory.CreateDirectory(outputPath);

            var buildPlayerOptions = new BuildPlayerOptions
            {
                scenes = scenes,
                locationPathName = outputPath,
                target = BuildTarget.WebGL,
                targetGroup = BuildTargetGroup.WebGL,
                options = options.DevelopmentBuild ? BuildOptions.Development : BuildOptions.None
            };

            Debug.Log($"FounderVerse WebGL build started. Output: {outputPath}");
            var report = BuildPipeline.BuildPlayer(buildPlayerOptions);
            var summary = report.summary;

            WriteCloudflareHeaders(outputPath, options.NativeCompressionHeaders);
            LogBuildSummary(summary, outputPath, options);

            if (summary.result != BuildResult.Succeeded)
            {
                throw new BuildFailedException($"FounderVerse WebGL build failed: {summary.result}");
            }
        }

        [MenuItem("FounderVerse/Build/Write Cloudflare Headers Only")]
        public static void WriteHeadersOnly()
        {
            var options = BuildOptionsFromCommandLine();
            var outputPath = NormalizeProjectRelativePath(options.OutputPath);
            Directory.CreateDirectory(outputPath);
            WriteCloudflareHeaders(outputPath, options.NativeCompressionHeaders);
            Debug.Log($"Cloudflare Pages headers written to {Path.Combine(outputPath, StableHeadersFileName)}");
        }

        [MenuItem("FounderVerse/Build/Validate WebGL Build Settings")]
        public static void ValidateWebGLBuildSettings()
        {
            var scenes = GetEnabledScenes();
            ValidateSceneCoverage(scenes);

            if (EditorUserBuildSettings.activeBuildTarget != BuildTarget.WebGL)
            {
                Debug.LogWarning("Active build target is not WebGL. The build method will switch it automatically.");
            }

            Debug.Log($"Enabled scenes: {string.Join(", ", scenes)}");
            Debug.Log($"WebGL compression: {PlayerSettings.WebGL.compressionFormat}");
            Debug.Log($"WebGL decompression fallback: {PlayerSettings.WebGL.decompressionFallback}");
            Debug.Log($"WebGL data caching: {PlayerSettings.WebGL.dataCaching}");
            Debug.Log($"WebGL name files as hashes: {PlayerSettings.WebGL.nameFilesAsHashes}");
        }

        private static FounderVerseBuildOptions BuildOptionsFromCommandLine()
        {
            var args = Environment.GetCommandLineArgs();

            return new FounderVerseBuildOptions
            {
                OutputPath = ReadArg(args, "-fvOutput", DefaultOutputPath),
                DevelopmentBuild = ReadBoolArg(args, "-fvDevelopmentBuild", false),
                NativeCompressionHeaders = ReadBoolArg(args, "-fvNativeCompressionHeaders", false),
                Compression = ReadArg(args, "-fvCompression", "gzip")
            };
        }

        private static void ConfigureWebGLPlayer(FounderVerseBuildOptions options)
        {
            if (EditorUserBuildSettings.activeBuildTarget != BuildTarget.WebGL)
            {
                var switched = EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.WebGL, BuildTarget.WebGL);
                if (!switched)
                {
                    throw new BuildFailedException("Failed to switch Unity build target to WebGL.");
                }
            }

            PlayerSettings.productName = DefaultProductName;
            PlayerSettings.WebGL.compressionFormat = ParseCompression(options.Compression);
            PlayerSettings.WebGL.decompressionFallback = !options.NativeCompressionHeaders;
            PlayerSettings.WebGL.dataCaching = true;
            PlayerSettings.WebGL.nameFilesAsHashes = true;
        }

        private static string[] GetEnabledScenes()
        {
            var scenes = EditorBuildSettings.scenes
                .Where(scene => scene.enabled)
                .Select(scene => scene.path)
                .Where(path => !string.IsNullOrWhiteSpace(path))
                .ToArray();

            if (scenes.Length == 0)
            {
                throw new BuildFailedException("No enabled scenes found in Build Settings.");
            }

            return scenes;
        }

        private static void ValidateSceneCoverage(IReadOnlyCollection<string> scenes)
        {
            var joinedScenes = string.Join("\n", scenes);
            foreach (var hint in ExpectedSceneNameHints)
            {
                if (joinedScenes.IndexOf(hint, StringComparison.OrdinalIgnoreCase) < 0)
                {
                    Debug.LogWarning($"Expected FounderVerse scene hint not found in Build Settings: {hint}");
                }
            }
        }

        private static void WriteCloudflareHeaders(string outputPath, bool nativeCompressionHeaders)
        {
            var headersPath = Path.Combine(outputPath, StableHeadersFileName);
            var contents = nativeCompressionHeaders ? NativeCompressionHeaders() : StableHeaders();
            File.WriteAllText(headersPath, contents);
        }

        private static string StableHeaders()
        {
            return "/*\n"
                + "  X-Content-Type-Options: nosniff\n"
                + "  Referrer-Policy: strict-origin-when-cross-origin\n";
        }

        private static string NativeCompressionHeaders()
        {
            return "/Build/*.wasm.gz\n"
                + "  Content-Type: application/wasm\n"
                + "  Content-Encoding: gzip\n\n"
                + "/Build/*.js.gz\n"
                + "  Content-Type: application/javascript\n"
                + "  Content-Encoding: gzip\n\n"
                + "/Build/*.data.gz\n"
                + "  Content-Type: application/octet-stream\n"
                + "  Content-Encoding: gzip\n\n"
                + "/Build/*.wasm.br\n"
                + "  Content-Type: application/wasm\n"
                + "  Content-Encoding: br\n\n"
                + "/Build/*.js.br\n"
                + "  Content-Type: application/javascript\n"
                + "  Content-Encoding: br\n\n"
                + "/Build/*.data.br\n"
                + "  Content-Type: application/octet-stream\n"
                + "  Content-Encoding: br\n\n"
                + "/*\n"
                + "  X-Content-Type-Options: nosniff\n"
                + "  Referrer-Policy: strict-origin-when-cross-origin\n";
        }

        private static WebGLCompressionFormat ParseCompression(string compression)
        {
            switch ((compression ?? string.Empty).Trim().ToLowerInvariant())
            {
                case "disabled":
                case "none":
                    return WebGLCompressionFormat.Disabled;
                case "brotli":
                case "br":
                    return WebGLCompressionFormat.Brotli;
                case "gzip":
                case "gz":
                default:
                    return WebGLCompressionFormat.Gzip;
            }
        }

        private static string NormalizeProjectRelativePath(string path)
        {
            if (string.IsNullOrWhiteSpace(path))
            {
                return DefaultOutputPath;
            }

            var projectRoot = Path.GetDirectoryName(Application.dataPath) ?? Directory.GetCurrentDirectory();
            return Path.IsPathRooted(path) ? path : Path.GetFullPath(Path.Combine(projectRoot, path));
        }

        private static string ReadArg(IReadOnlyList<string> args, string key, string fallback)
        {
            for (var i = 0; i < args.Count - 1; i++)
            {
                if (args[i].Equals(key, StringComparison.OrdinalIgnoreCase))
                {
                    return args[i + 1];
                }
            }

            return fallback;
        }

        private static bool ReadBoolArg(IReadOnlyList<string> args, string key, bool fallback)
        {
            var value = ReadArg(args, key, fallback ? "true" : "false");
            return value.Equals("1", StringComparison.OrdinalIgnoreCase)
                || value.Equals("true", StringComparison.OrdinalIgnoreCase)
                || value.Equals("yes", StringComparison.OrdinalIgnoreCase);
        }

        private static void LogBuildSummary(BuildSummary summary, string outputPath, FounderVerseBuildOptions options)
        {
            Debug.Log("FounderVerse WebGL build summary\n"
                + $"Result: {summary.result}\n"
                + $"Output: {outputPath}\n"
                + $"Total size: {summary.totalSize} bytes\n"
                + $"Total time: {summary.totalTime}\n"
                + $"Compression: {PlayerSettings.WebGL.compressionFormat}\n"
                + $"Native compression headers: {options.NativeCompressionHeaders}\n"
                + $"Development build: {options.DevelopmentBuild}");
        }

        private sealed class FounderVerseBuildOptions
        {
            public string OutputPath;
            public bool DevelopmentBuild;
            public bool NativeCompressionHeaders;
            public string Compression;
        }
    }
}
#endif
