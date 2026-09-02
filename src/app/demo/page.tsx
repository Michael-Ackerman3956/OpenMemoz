"use client";

import { useEffect, useState, useCallback } from "react";

interface RegisteredTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => unknown;
}

export default function WebMCPDemoPage() {
  const [registeredTools, setRegisteredTools] = useState<RegisteredTool[]>([]);
  const [selectedToolIndex, setSelectedToolIndex] = useState(0);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [executionResult, setExecutionResult] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [newsroomUrl, setNewsroomUrl] = useState("");
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const discoverToolsFromIframe = useCallback(() => {
    const iframe = document.getElementById("newsroom-frame") as HTMLIFrameElement | null;
    if (!iframe?.contentDocument?.modelContext) return;

    const tools: RegisteredTool[] = [];
    const originalRegisterTool = iframe.contentDocument.modelContext.registerTool;

    iframe.contentDocument.modelContext.registerTool = async (
      tool: RegisteredTool,
    ) => {
      tools.push({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        execute: tool.execute,
      });
      return originalRegisterTool.call(iframe.contentDocument!.modelContext, tool);
    };

    setRegisteredTools(tools);
  }, []);

  useEffect(() => {
    const currentOrigin = window.location.origin;
    setNewsroomUrl(currentOrigin);
  }, []);

  const selectedTool = registeredTools[selectedToolIndex] ?? null;

  const executeSelectedTool = async () => {
    if (!selectedTool) return;
    setIsExecuting(true);
    try {
      const args: Record<string, unknown> = {};
      const properties = (selectedTool.inputSchema as { properties?: Record<string, unknown> }).properties ?? {};
      for (const key of Object.keys(properties)) {
        if (inputValues[key]?.trim()) {
          args[key] = inputValues[key].trim();
        }
      }
      const result = await selectedTool.execute(args);
      setExecutionResult(JSON.stringify(result, null, 2));
    } catch (error) {
      setExecutionResult(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      background: "#0E0E0C",
      color: "#F0EFEB",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Left panel — tool controls */}
      <div style={{
        width: "420px",
        flexShrink: 0,
        borderRight: "1px solid #2A2A27",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid #2A2A27",
        }}>
          <div style={{
            fontSize: "0.68rem",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "#5CB85C",
            marginBottom: "6px",
            fontFamily: "monospace",
          }}>
            WebMCP Demo Harness
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>
            Newsroom Agent Tools
          </div>
          <div style={{ fontSize: "0.82rem", color: "#9C9B96", marginTop: "4px" }}>
            {registeredTools.length > 0
              ? `${registeredTools.length} tools discovered`
              : "Load the newspaper to discover tools"}
          </div>
        </div>

        {/* Tool list */}
        <div style={{
          flex: "0 0 auto",
          maxHeight: "240px",
          overflowY: "auto",
          borderBottom: "1px solid #2A2A27",
        }}>
          {registeredTools.map((tool, index) => (
            <button
              key={tool.name}
              onClick={() => {
                setSelectedToolIndex(index);
                setInputValues({});
                setExecutionResult("");
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 24px",
                border: "none",
                background: index === selectedToolIndex ? "rgba(92,184,92,0.12)" : "transparent",
                color: index === selectedToolIndex ? "#5CB85C" : "#9C9B96",
                fontFamily: "monospace",
                fontSize: "0.8rem",
                cursor: "pointer",
                borderBottom: "1px solid #1E1E1C",
              }}
            >
              {tool.name}
            </button>
          ))}
        </div>

        {/* Selected tool details + inputs */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 24px",
        }}>
          {selectedTool ? (
            <>
              <div style={{
                fontSize: "0.95rem",
                fontWeight: 600,
                marginBottom: "8px",
                fontFamily: "monospace",
                color: "#5CB85C",
                wordBreak: "break-all",
              }}>
                {selectedTool.name}
              </div>
              <div style={{
                fontSize: "0.82rem",
                color: "#9C9B96",
                lineHeight: 1.5,
                marginBottom: "16px",
              }}>
                {selectedTool.description}
              </div>

              {/* Input fields */}
              {Object.entries(
                (selectedTool.inputSchema as { properties?: Record<string, { type?: string; description?: string }> }).properties ?? {}
              ).map(([key, schema]) => (
                <div key={key} style={{ marginBottom: "12px" }}>
                  <label style={{
                    display: "block",
                    fontSize: "0.72rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "#6B6A65",
                    marginBottom: "4px",
                    fontFamily: "monospace",
                  }}>
                    {key}
                    {(selectedTool.inputSchema as { required?: string[] }).required?.includes(key) && (
                      <span style={{ color: "#E25A5A", marginLeft: "4px" }}>*</span>
                    )}
                  </label>
                  <input
                    type="text"
                    placeholder={schema.description || key}
                    value={inputValues[key] || ""}
                    onChange={(e) =>
                      setInputValues((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "#1E1E1C",
                      border: "1px solid #2A2A27",
                      borderRadius: "6px",
                      color: "#F0EFEB",
                      fontFamily: "monospace",
                      fontSize: "0.82rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}

              <button
                onClick={executeSelectedTool}
                disabled={isExecuting}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: isExecuting ? "#333330" : "#5CB85C",
                  color: isExecuting ? "#9C9B96" : "#0E0E0C",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 600,
                  fontSize: "0.88rem",
                  cursor: isExecuting ? "not-allowed" : "pointer",
                  marginTop: "8px",
                }}
              >
                {isExecuting ? "Executing..." : "Execute Tool"}
              </button>
            </>
          ) : (
            <div style={{ color: "#6B6A65", fontSize: "0.85rem" }}>
              Select a tool from the list above
            </div>
          )}
        </div>

        {/* Result panel */}
        {executionResult && (
          <div style={{
            flex: "0 0 auto",
            maxHeight: "300px",
            overflowY: "auto",
            padding: "16px 24px",
            borderTop: "1px solid #2A2A27",
            background: "#1A1A17",
          }}>
            <div style={{
              fontSize: "0.68rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#6B6A65",
              marginBottom: "8px",
            }}>
              Response
            </div>
            <pre style={{
              margin: 0,
              fontFamily: "monospace",
              fontSize: "0.75rem",
              lineHeight: 1.6,
              color: "#9C9B96",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}>
              {executionResult}
            </pre>
          </div>
        )}
      </div>

      {/* Right panel — iframe with newspaper */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{
          padding: "10px 20px",
          borderBottom: "1px solid #2A2A27",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#1A1A17",
        }}>
          <div style={{
            fontFamily: "monospace",
            fontSize: "0.8rem",
            color: "#9C9B96",
          }}>
            {newsroomUrl || "Loading..."}
          </div>
          <button
            onClick={discoverToolsFromIframe}
            style={{
              padding: "6px 14px",
              background: "#5CB85C",
              color: "#0E0E0C",
              border: "none",
              borderRadius: "5px",
              fontWeight: 600,
              fontSize: "0.78rem",
              cursor: "pointer",
            }}
          >
            Discover Tools
          </button>
        </div>
        <iframe
          id="newsroom-frame"
          src="/"
          onLoad={() => setIframeLoaded(true)}
          style={{
            flex: 1,
            border: "none",
            background: "#0E0E0C",
          }}
        />
        {!iframeLoaded && (
          <div style={{
            position: "absolute",
            top: "50%",
            left: "60%",
            transform: "translate(-50%, -50%)",
            color: "#6B6A65",
            fontSize: "0.9rem",
          }}>
            Loading newspaper...
          </div>
        )}
      </div>
    </div>
  );
}
