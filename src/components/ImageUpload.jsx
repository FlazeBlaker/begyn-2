import { useState, useRef } from "react";

export default function ImageUpload({ selectedImage, onImageChange }) {
    const fileInputRef = useRef(null);
    const [dragActive, setDragActive] = useState(false);

    const handleFile = (file) => {
        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onImageChange(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const clearImage = (e) => {
        e.stopPropagation();
        onImageChange(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div style={{ marginBottom: "24px", animation: "fadeIn 0.5s ease-out" }}>
            <label style={{ fontSize: "1rem", fontWeight: "500", color: "#f0f0f0", marginBottom: "12px", display: "block" }}>
                Upload Reference Image (Optional)
            </label>

            <div
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                style={{
                    border: `2px dashed ${dragActive ? "#8b5cf6" : "rgba(255, 255, 255, 0.2)"}`,
                    borderRadius: "12px",
                    padding: "20px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: dragActive ? "rgba(139, 92, 246, 0.1)" : "rgba(0, 0, 0, 0.2)",
                    transition: "all 0.2s ease-in-out",
                    position: "relative",
                    minHeight: "120px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center"
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleChange}
                    style={{ display: "none" }}
                />

                {selectedImage ? (
                    <div style={{ position: "relative", width: "100%", maxWidth: "200px" }}>
                        <img
                            src={selectedImage}
                            alt="Reference"
                            style={{
                                width: "100%",
                                borderRadius: "8px",
                                border: "1px solid rgba(255,255,255,0.1)",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
                            }}
                        />
                        <button
                            onClick={clearImage}
                            style={{
                                position: "absolute",
                                top: "-10px",
                                right: "-10px",
                                background: "#ef4444",
                                color: "white",
                                border: "none",
                                borderRadius: "50%",
                                width: "24px",
                                height: "24px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "14px",
                                boxShadow: "0 2px 5px rgba(0,0,0,0.3)"
                            }}
                        >
                            ✕
                        </button>
                    </div>
                ) : (
                    <>
                        <span style={{ fontSize: "2rem", marginBottom: "10px", display: "block" }}>🖼️</span>
                        <p style={{ color: "#a0a0b0", margin: 0, fontSize: "0.95rem" }}>
                            Click or drag image here
                        </p>
                        <p style={{ color: "#64748b", margin: "5px 0 0", fontSize: "0.8rem" }}>
                            Supports JPG, PNG
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
