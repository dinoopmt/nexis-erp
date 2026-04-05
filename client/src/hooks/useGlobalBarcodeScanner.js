/**
 * 🔬 Global Barcode Scanner Hook
 * 
 * Features:
 * - Listens globally (works without input focus)
 * - Detects scanner vs human typing
 * - Prevents duplicate scans
 * - Excludes INPUT/TEXTAREA elements
 * - Supports Enter or Tab suffix
 * - Sound feedback (optional)
 * - Production-grade with logging
 * 
 * Usage:
 * useGlobalBarcodeScanner((barcode) => {
 *   console.log("Scanned:", barcode);
 *   handleBarcodeScanned(barcode);
 * });
 */

import { useEffect, useRef } from "react";

const cleanScannedBarcode = (rawValue, { stripPrefix, stripSuffix }) => {
  let cleaned = String(rawValue || "").trim().replace(/\s+/g, "");

  if (stripPrefix) {
    cleaned = cleaned.replace(/^\]C1/, "");
  }

  if (stripSuffix) {
    cleaned = cleaned.replace(/[\r\n]+$/g, "");
  }

  return cleaned;
};

const playAudioFeedback = (soundPath) => {
  if (!soundPath) return Promise.resolve();
  return new Audio(soundPath).play();
};

export const useGlobalBarcodeScanner = (onScan, options = {}) => {
  const {
    minLength = 3,
    maxTypingSpeed = 100, // ms - if faster, it's a scanner
    debounceTime = 500, // ms - prevent duplicate scans
    enableSound = false,
    soundUrl = "/beep.mp3",
    successSound = "/beep.mp3",
    errorSound = "/error.mp3",
    ignoreInputFields = true,
    debugMode = false,
    preventDefaultOnScan = true,
    stripPrefix = true,
    stripSuffix = true,
    allowDuplicateScan = false,
    enabled = true,
  } = options;

  const buffer = useRef("");
  const lastTime = useRef(Date.now());
  const lastScanned = useRef("");
  const lastScanTime = useRef(0);
  const pausedRef = useRef(false); // 🔍 NEW: Pause/Resume control

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const handleKeyDown = (e) => {
      // � NEW: Check if scanner is paused
      if (pausedRef.current) {
        return; // Scanner is paused - ignore all input
      }

      // �🚫 Ignore if user is typing in input/textarea
      if (ignoreInputFields) {
        const activeElement = document.activeElement;
        const tagName = activeElement?.tagName;
        const isInput =
          tagName === "INPUT" ||
          tagName === "TEXTAREA" ||
          activeElement?.isContentEditable;

        if (isInput) {
          if (debugMode) {
            console.log("🔇 Ignoring - user typing in input field");
          }
          return;
        }
      }

      const now = Date.now();
      const timeDiff = now - lastTime.current;

      // 🧠 SCANNER DETECTION: If delay > threshold, human is typing (reset)
      if (timeDiff > maxTypingSpeed) {
        if (debugMode && buffer.current.length > 0) {
          console.log(
            `⏱️ Buffer reset (human typing detected: ${timeDiff}ms delay)`
          );
        }
        buffer.current = "";
      }

      lastTime.current = now;

      // ✅ END OF SCAN: Enter key (NOT Tab - Tab is for navigation)
      if (e.key === "Enter") {
        const cleanBarcode = cleanScannedBarcode(buffer.current, {
          stripPrefix,
          stripSuffix,
        });

        // 🔍 ONLY handle if we have a valid barcode
        if (cleanBarcode.length >= minLength) {
          if (preventDefaultOnScan) {
            e.preventDefault(); // ✅ Only prevent default if we actually scanned something
          }

          // 🚫 DUPLICATE PREVENTION: Check if scanned recently
          const timeSinceLastScan = now - lastScanTime.current;
          if (
            !allowDuplicateScan &&
            cleanBarcode === lastScanned.current &&
            timeSinceLastScan < debounceTime
          ) {
            if (debugMode) {
              console.log(
                `⚠️ Duplicate scan blocked: "${cleanBarcode}" (${timeSinceLastScan}ms ago)`
              );
            }
            buffer.current = "";
            return;
          }

          // ✨ VALID SCAN
          if (debugMode) {
            console.log(`✅ Barcode scanned: ${cleanBarcode}`);
          }

          // 🔊 SOUND FEEDBACK
          if (enableSound) {
            try {
              playAudioFeedback(soundUrl).catch((err) => {
                console.warn("⚠️ Could not play scan sound:", err.message);
              });
            } catch (err) {
              console.warn("⚠️ Sound playback failed:", err.message);
            }
          }

          // 📤 CALLBACK
          onScan(cleanBarcode, {
            timestamp: now,
            rawValue: buffer.current,
            playSuccess: () =>
              playAudioFeedback(successSound).catch((err) => {
                console.warn("⚠️ Could not play success sound:", err.message);
              }),
            playError: () =>
              playAudioFeedback(errorSound).catch((err) => {
                console.warn("⚠️ Could not play error sound:", err.message);
              }),
          });

          // 📝 TRACK FOR DUPLICATE PREVENTION
          lastScanned.current = cleanBarcode;
          lastScanTime.current = now;
        } else if (debugMode && cleanBarcode.length > 0) {
          console.log(
            `⚠️ Barcode too short (${cleanBarcode.length}/${minLength}): "${cleanBarcode}"`
          );
        }

        buffer.current = "";
        return;
      }

      // 🔍 IMPORTANT: Tab key should NEVER be prevented - always allow natural Tab navigation
      if (e.key === "Tab") {
        buffer.current = ""; // Clear buffer when Tab is pressed
        return; // ✅ Let browser handle Tab naturally for focus navigation
      }

      // 📝 BUILD BARCODE: Only single character keys
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buffer.current += e.key;

        if (debugMode) {
          console.log(
            `📝 Buffer: "${buffer.current}" (speed: ${timeDiff}ms, scanner: ${
              timeDiff <= maxTypingSpeed ? "YES ✅" : "NO ❌"
            })`
          );
        }
      }
    };

    // 🎯 ATTACH GLOBAL LISTENER
    window.addEventListener("keydown", handleKeyDown, true); // Capture phase

    // 🧹 CLEANUP
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [
    onScan,
    minLength,
    maxTypingSpeed,
    debounceTime,
    enableSound,
    soundUrl,
    successSound,
    errorSound,
    ignoreInputFields,
    debugMode,
    preventDefaultOnScan,
    stripPrefix,
    stripSuffix,
    allowDuplicateScan,
    enabled,
  ]);

  // 🔓 EXPOSE BUFFER STATE (for debugging or external control)
  return {
    getBuffer: () => buffer.current,
    clearBuffer: () => {
      buffer.current = "";
    },
    resetDuplicateCheck: () => {
      lastScanned.current = "";
      lastScanTime.current = 0;
    },
    // 🆕 PAUSE/RESUME CONTROL
    pause: () => {
      pausedRef.current = true;
      if (debugMode) console.log("⏸️ Scanner paused");
    },
    resume: () => {
      pausedRef.current = false;
      buffer.current = ""; // Clear buffer when resuming
      if (debugMode) console.log("▶️ Scanner resumed");
    },
    isPaused: () => pausedRef.current,
  };
};

export default useGlobalBarcodeScanner;
