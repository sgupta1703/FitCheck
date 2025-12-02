import { useEffect, useRef, useState } from "react";
import TargetCursor from "../TargetCursor";

export default function UploadClothes({ displayName }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState(null);
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState("");
  const [debug, setDebug] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  const uploadingRef = useRef(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setSelectedMatch(null);
    }
    if (selectedMatch) {
      document.addEventListener("keydown", onKey);
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", onKey);
        document.body.style.overflow = prev;
      };
    }
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [selectedMatch]);

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] ?? null);
    setTags(null);
    setMatches([]);
    setError("");
    setDebug(null);
    setSuccessMessage("");
  };

  const handleUpload = async () => {
    if (uploadingRef.current) return;
    uploadingRef.current = true;

    if (!file) {
      setError("Select a file first.");
      uploadingRef.current = false;
      return;
    }

    setLoading(true);
    setError("");
    setDebug(null);
    setSuccessMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        body: formData,
      });

      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        throw new Error("Server returned non-JSON response: " + rawText);
      }

      if (!response.ok) {
        throw new Error(data.error || "Predict failed");
      }

      setTags(data.tags || {});
      setMatches(Array.isArray(data.matches) ? data.matches : []);
      setDebug(data.debug ?? null);
      setSuccessMessage("Uploaded — results ready");
    } catch (err) {
      console.error(err);
      setError(err?.message || "Upload failed");
    } finally {
      setTimeout(() => {
        setLoading(false);
        uploadingRef.current = false;
      }, 500);
    }
  };

  const MIN_MATCH_CARD_WIDTH = 300;
  const MATCH_CARD_HEIGHT = 500;

  return (
    <>
      <div style={pageStyles.page}>
        <style dangerouslySetInnerHTML={{ __html: pageStyles._keyframes }} />

        <div style={pageStyles.card} role="region" aria-label="Upload clothing item">
          <div style={pageStyles.headerRow}>
            <h1 style={pageStyles.heading}>Upload Clothing</h1>
            <div style={pageStyles.greeting}>
              {displayName ? `Hi, ${displayName}` : "Not logged in"}
            </div>
          </div>

          {!displayName ? (
            <div style={{ ...pageStyles.msg, ...pageStyles.msgWarning }}>
              You must be logged in to upload clothes.
            </div>
          ) : (
            <>
              <div style={{ position: "relative" }}>
                <input
                  id="file"
                  name="file"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={pageStyles.hiddenInput}
                  disabled={loading}
                />

                <div
                  style={{
                    ...pageStyles.dropArea,
                    cursor: loading ? "default" : "pointer",
                    pointerEvents: loading ? "none" : "auto",
                    opacity: loading ? 0.8 : 1,
                  }}
                  className="cursor-target"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !loading) {
                      document.getElementById("file")?.click();
                    }
                  }}
                  onClick={() => !loading && document.getElementById("file")?.click()}
                >
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="preview"
                      style={pageStyles.previewImage}
                      onError={(e) => {
                        console.error("Preview load error for", e.target.src);
                        e.target.style.opacity = 0.6;
                      }}
                    />
                  ) : (
                    <div style={pageStyles.dropHelp}>
                      <div style={{ fontWeight: 700 }}>Choose an image</div>
                      <div style={{ fontSize: 13, marginTop: 6, color: "#475569" }}>
                        .jpg, .png — suggested 800×800 px
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={pageStyles.controlsRow}>
                <div style={pageStyles.fileInfo}>
                  {file ? (
                    <>
                      <div style={pageStyles.fileName}>{file.name}</div>
                      <div style={pageStyles.fileMeta}>
                        {(file.size / 1024).toFixed(1)} KB · {file.type || "image"}
                      </div>
                    </>
                  ) : (
                    <div style={pageStyles.placeholder}>No file selected</div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={loading || !file}
                  style={{
                    ...pageStyles.button,
                    ...(loading || !file ? pageStyles.buttonDisabled : {}),
                  }}
                  aria-busy={loading}
                  className="cursor-target"
                >
                  {loading ? "Uploading..." : "Upload"}
                </button>
              </div>

              <div
                style={{
                  ...pageStyles.loadingBar,
                  opacity: loading ? 1 : 0,
                  transition: "opacity 420ms cubic-bezier(.2,.9,.2,1)",
                  pointerEvents: "none",
                }}
                aria-hidden
              >
                <div
                  style={{
                    ...pageStyles.loadingProgress,
                    height: 6,
                    borderRadius: 999,
                  }}
                />
              </div>

              {error && (
                <div role="alert" style={{ ...pageStyles.msg, ...pageStyles.msgError }}>
                  {error}
                </div>
              )}

              {successMessage && (
                <div role="status" style={{ ...pageStyles.msg, ...pageStyles.msgSuccess }}>
                  {successMessage}
                </div>
              )}

              {matches && matches.length > 0 && (
                <div style={{ ...pageStyles.matchesBox }}>
                  <h2 style={pageStyles.subHeading}>Matched Picks!</h2>

                  {/* ⭐ NEW HORIZONTAL SCROLL WRAPPER ⭐ */}
                  <div style={pageStyles.horizontalScroll}>
                    {matches.map((imgPath, idx) => {
                      const src = `http://127.0.0.1:8000/static/${imgPath}`;
                      const isHover = hoverIdx === idx;
                      return (
                        <div
                          key={idx}
                          role="button"
                          className="cursor-target"
                          tabIndex={0}
                          aria-label={`Open match ${idx} full view`}
                          onClick={() => setSelectedMatch(src)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") setSelectedMatch(src);
                          }}
                          onMouseEnter={() => setHoverIdx(idx)}
                          onMouseLeave={() => setHoverIdx(null)}
                          style={{
                            ...pageStyles.matchCard,
                            flex: `0 0 ${MIN_MATCH_CARD_WIDTH}px`,
                            height: MATCH_CARD_HEIGHT,
                            ...(isHover ? pageStyles.matchCardHover : {}),
                          }}
                        >
                          <img
                            src={src}
                            alt={`match-${idx}`}
                            style={{
                              ...pageStyles.matchImage,
                              transform: isHover ? "scale(1.03)" : "scale(1)",
                            }}
                            onError={(e) => {
                              console.error("Image load error for", e.target.src);
                              e.target.style.opacity = 0.6;
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  {/* END NEW SECTION */}
                </div>
              )}

              {matches && matches.length === 0 && tags && (
                <div style={{ ...pageStyles.msg, ...pageStyles.msgInfo }}>
                  No matching items found in the clothes library.
                </div>
              )}
            </>
          )}
        </div>

        {selectedMatch && (
          <div
            style={pageStyles.lightboxOverlay}
            role="dialog"
            aria-modal="true"
            onClick={() => setSelectedMatch(null)}
          >
            <div
              style={pageStyles.lightboxContent}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <button
                onClick={() => setSelectedMatch(null)}
                aria-label="Close preview"
                style={pageStyles.lightboxClose}
                className="cursor-target"
              >
                ✕
              </button>
              <img src={selectedMatch} alt="full preview" style={pageStyles.lightboxImage} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const pageStyles = {
  page: {
    height: "100%",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: "28px 20px",
    boxSizing: "border-box",
    background: "linear-gradient(180deg, rgba(247,250,252,0.6), rgba(255,255,255,0.6))",
    overflowY: "auto", 
  },

    horizontalScroll: {
    display: "flex",
    gap: 12,
    overflowX: "auto",
    paddingBottom: 10,
    scrollbarWidth: "thin",
    scrollbarColor: "#94a3b8 #f8fafc",
  },
  card: {
    width: "100%",
    maxWidth: 1100,
    padding: 28,
    borderRadius: 14,
    background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(250,250,250,0.98))",
    boxShadow: "0 20px 50px rgba(2,6,23,0.06)",
    border: "1px solid rgba(16,24,40,0.04)",
    backdropFilter: "blur(6px)",
    boxSizing: "border-box",
  },

  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  heading: {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
    color: "#0b1220",
  },
  greeting: {
    color: "#374151",
    fontSize: 14,
    background: "rgba(99,102,241,0.06)",
    padding: "6px 10px",
    borderRadius: 10,
    fontWeight: 600,
  },

  fileLabel: {
    display: "block",
    width: "100%",
    cursor: "pointer",
  },
  hiddenInput: {
    display: "none",
  },

  dropArea: {
    marginBottom: 14,
    width: "100%",
    height: 260,
    borderRadius: 12,
    border: "1px dashed rgba(16,24,40,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    background: "#fff",
    outline: "none",
  },

  dropHelp: {
    textAlign: "center",
    color: "#0b1220",
  },

  previewImage: {
    width: "auto",
    height: "auto",
    maxWidth: "90%",
    maxHeight: "90%",
    objectFit: "contain",
    display: "block",
  },

  controlsRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },

  fileInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  fileName: {
    fontWeight: 700,
    color: "#0b1220",
  },
  fileMeta: {
    fontSize: 13,
    color: "#475569",
    marginTop: 4,
  },
  placeholder: {
    color: "#94a3b8",
  },

  button: {
    marginLeft: 12,
    minWidth: 140,
    height: 44,
    borderRadius: 10,
    border: "none",
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer",
    background: "linear-gradient(90deg,#6366f1,#ec4899)",
    color: "white",
    boxShadow: "0 8px 22px rgba(99,102,241,0.12)",
    transition: "transform 150ms ease, box-shadow 150ms ease, opacity 150ms ease",
  },
  buttonDisabled: {
    opacity: 0.65,
    cursor: "default",
    transform: "none",
    boxShadow: "none",
  },

  loadingBar: {
    marginTop: 12,
    height: 10,
    background: "rgba(15,23,42,0.04)",
    borderRadius: 8,
    overflow: "hidden",
  },

  loadingProgress: {
    width: "100%",
    height: "100%",
    background: "linear-gradient(90deg, #6366f1 25%, #ec4899 50%, #6366f1 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 2s linear infinite",
    borderRadius: 6,
  },

  matchesBox: {
    marginTop: 18,
  },
  subHeading: {
    margin: "0 0 12px 0",
    fontSize: 20,
    color: "#1b59d6ff",
  },
  matchesGrid: {
    display: "grid",
    gap: 12,
  },
  matchCard: {
    width: "100%",
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
    border: "1px solid rgba(16,24,40,0.04)",
    background: "white",
    boxShadow: "0 8px 20px rgba(2,6,23,0.03)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 180ms ease, box-shadow 180ms ease",
    /* internal padding so images have breathing room inside the card */
    padding: 12,
    boxSizing: "border-box",
    cursor: "pointer",
  },
  matchCardHover: {
    transform: "scale(1.03)",
    boxShadow: "0 18px 40px rgba(2,6,23,0.08)",
  },
  matchImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    maxWidth: "100%",
    maxHeight: "100%",
    display: "block",
    transition: "transform 240ms ease",
  },
  lightboxOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(2,6,23,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 20,
  },
  lightboxContent: {
    position: "relative",
    width: "min(1100px, 92vw)",
    height: "min(800px, 92vh)",
    borderRadius: 12,
    overflow: "hidden",
    background: "#fff",
    boxShadow: "0 20px 60px rgba(2,6,23,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxImage: {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    display: "block",
  },
  lightboxClose: {
    position: "absolute",
    right: 14,
    top: 14,
    background: "rgba(255,255,255,0.9)",
    border: "none",
    borderRadius: 8,
    padding: "6px 8px",
    cursor: "pointer",
    fontWeight: 700,
  },

  msg: {
    marginTop: 14,
    padding: "10px 12px",
    borderRadius: 10,
    fontSize: 14,
  },
  msgError: {
    background: "rgba(254,242,242,0.95)",
    color: "#9f1239",
    border: "1px solid rgba(159,18,57,0.06)",
  },
  msgSuccess: {
    background: "rgba(240,249,255,0.95)",
    color: "#0369a1",
    border: "1px solid rgba(3,105,161,0.06)",
  },
  msgInfo: {
    background: "rgba(248,250,252,0.95)",
    color: "#0f172a",
    border: "1px solid rgba(2,6,23,0.04)",
  },
  msgWarning: {
    background: "rgba(255,249,230,0.95)",
    color: "#92400e",
    border: "1px solid rgba(146,64,14,0.06)",
  },

  debugBox: {
    marginTop: 14,
    borderRadius: 8,
    border: "1px solid rgba(16,24,40,0.04)",
    padding: 8,
    background: "#fff",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },

  _keyframes: `
    @keyframes shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `,
};

if (typeof document !== "undefined") {
  const styleId = "uploadclothes-keyframes";
  const keyframes = `
    @keyframes shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `;
  const existing = document.getElementById(styleId);
  if (existing) {
    existing.innerHTML = keyframes;
  } else {
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = keyframes;
    document.head.appendChild(style);
  }
}
