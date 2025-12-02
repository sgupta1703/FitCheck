import React, { useState, useRef } from "react";
import {
  Image as ImageIcon,
  Upload,
  FileJson,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import TargetCursor from "../TargetCursor";

import "./editdb.css"; 

export default function EditDatabase() {
  const [baseName, setBaseName] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [jsonFile, setJsonFile] = useState(null);
  const [jsonText, setJsonText] = useState("");
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("info");
  const [busy, setBusy] = useState(false);
  const jsonTextareaRef = useRef();
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  function resetStatusDelayed(msg = "", type = "info", ms = 4000) {
    setStatus(msg);
    setStatusType(type);
    if (ms > 0) setTimeout(() => setStatus(""), ms);
  }

  const onImageChange = (e) => {
    const f = e.target.files?.[0] || null;
    setImageFile(f);

    if (f) {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(f);

      if (!baseName) {
        const name = f.name.replace(/\.[^/.]+$/, "");
        setBaseName(name);
      }
    } else {
      setImagePreview(null);
    }
  };

  const onJsonFileChange = async (e) => {
    const f = e.target.files?.[0] || null;
    setJsonFile(f);
    if (f) {
      const text = await f.text();
      setJsonText(text);
    } else setJsonText("");
  };

  const prepareJsonBlob = () => {
    const txt = jsonText?.trim()?.length ? jsonText.trim() : "{}";
    return new Blob([txt], { type: "application/json" });
  };

  const onSave = async () => {
    if (!baseName.trim())
      return resetStatusDelayed("Enter a base filename.", "error");
    if (!imageFile)
      return resetStatusDelayed("Choose an image to upload.", "error");

    setBusy(true);
    setStatus("Saving...");

    try {
      const base = baseName.trim();
      const imgExt = imageFile.name.match(/(\.[^.]+)$/)?.[1] || ".jpg";
      const imageFilename = `${base}${imgExt}`;
      const jsonFilename = `${base}.json`;
      const jsonBlob = prepareJsonBlob();

      if (window.showDirectoryPicker) {
        const dir = await window.showDirectoryPicker({ mode: "readwrite" });
        const imgHandle = await dir.getFileHandle(imageFilename, { create: true });
        const imgWritable = await imgHandle.createWritable();
        await imgWritable.write(await imageFile.arrayBuffer());
        await imgWritable.close();
        const labels = await dir.getDirectoryHandle("labels", { create: true });
        const jsonHandle = await labels.getFileHandle(jsonFilename, { create: true });
        const jsonWritable = await jsonHandle.createWritable();
        await jsonWritable.write(await jsonBlob.arrayBuffer());
        await jsonWritable.close();

        resetStatusDelayed("Saved successfully", "success");
      } else {
        const a1 = document.createElement("a");
        a1.href = URL.createObjectURL(imageFile);
        a1.download = imageFilename;
        a1.click();

        const a2 = document.createElement("a");
        a2.href = URL.createObjectURL(jsonBlob);
        a2.download = jsonFilename;
        a2.click();

        resetStatusDelayed(
          "Files downloaded. Move them to the Clothes folder manually.",
          "warning"
        );
      }
    } catch (err) {
      console.error(err);
      resetStatusDelayed("Error saving: " + err.message, "error");
    }

    setBusy(false);
  };

  const onPasteJsonFromFile = async () => {
    if (!jsonFile) return resetStatusDelayed("No JSON selected.", "error");
    const t = await jsonFile.text();
    setJsonText(t);
    setShowJsonEditor(true);
    resetStatusDelayed("JSON loaded.", "success");
  };

  return (
    <div className="page">
      <div className="card">

        <div>
          <h1 className="title">Database Editor</h1>
          <p className="subtitle">Upload clothing item + label JSON</p>
        </div>

        <div className="field">
          <label>Base Filename</label>
          <input
            className="input cursor-target"
            value={baseName}
            onChange={(e) =>
              setBaseName(e.target.value.replace(/\s+/g, "_"))
            }
            placeholder="e.g. denim"
          />
        </div>

        <div className="field">
          <label className="label-icon">
            Image File
          </label>
        
          <div className="upload-box">
            <input
              type="file"
              accept="image/*"
              onChange={onImageChange}
              className="file-input cursor-target"
              
            />
            <Upload className="upload-icon" />
            <p className="upload-text">
              {imageFile ? imageFile.name : "Click to upload image"}
            </p>
          </div>
        </div>

        {imagePreview && (
          <div>
            <img src={imagePreview} alt="Preview" className="preview" />
          </div>
        )}

        <div className="field">
          <label className="label-icon">
            Label JSON File
          </label>

          <div className="json-row">
            <div className="json-upload-box">
              <input
                type="file"
                accept=".json"
                className="file-input cursor-target"
                onChange={onJsonFileChange}
              />
              <p className="upload-text">
                {jsonFile ? jsonFile.name : "Click to upload JSON"}
              </p>
            </div>

            <button
              onClick={onPasteJsonFromFile}
              disabled={!jsonFile}
              className="button cursor-target"
            >
              Load JSON
            </button>
          </div>
        </div>

        {showJsonEditor && (
          <textarea
            ref={jsonTextareaRef}
            className="textarea"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
          />
        )}

        <button onClick={onSave} disabled={busy} className="save-button cursor-target">
          {busy ? "Saving..." : "Save to Clothes Folder"}
        </button>

        {status && (
          <div className={`status ${statusType}`}>
            {statusType === "success" ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            {status}
          </div>
        )}
      </div>
    </div>
  );
}