"use client";

import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileUp,
  Upload,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
  X,
  FileSpreadsheet,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/motion";

// ── Types ────────────────────────────────────────────────────────────

interface ParsedRow {
  title: string;
  description: string;
  category: string;
  brand: string;
  size: string;
  condition: string;
  price: string;
  costprice: string;
}

interface ImportResult {
  imported: number;
  errors: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────

const EXPECTED_HEADERS = [
  "title",
  "description",
  "category",
  "brand",
  "size",
  "condition",
  "price",
  "costprice",
];

const SAMPLE_CSV = `title,description,category,brand,size,condition,price,costprice
"Vintage Nike Windbreaker","90s colorblock windbreaker, great condition",Outerwear,Nike,L,Good,65,15
"Carhartt WIP Beanie","Classic acrylic beanie in black",Accessories,Carhartt WIP,OS,New with tags,35,12
"Levi's 501 Jeans","Original fit, medium wash",Bottoms,Levi's,32x32,Good,55,20`;

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  return lines.map((line) => {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          fields.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    fields.push(current.trim());
    return fields;
  });
}

// ═════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════

export default function BulkImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }
    setFile(f);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);

      const parsed = parseCSV(text);
      if (parsed.length < 2) {
        toast.error("CSV must have a header row and at least one data row");
        return;
      }

      const hdrs = parsed[0].map((h) => h.toLowerCase().trim());
      setHeaders(hdrs);

      // Map column indices
      const colIndex: Record<string, number> = {};
      for (const name of EXPECTED_HEADERS) {
        const idx = hdrs.indexOf(name);
        if (idx !== -1) colIndex[name] = idx;
      }

      const dataRows: ParsedRow[] = [];
      for (let i = 1; i < parsed.length; i++) {
        const row = parsed[i];
        const get = (col: string) =>
          colIndex[col] !== undefined ? (row[colIndex[col]] || "").trim() : "";

        dataRows.push({
          title: get("title"),
          description: get("description"),
          category: get("category"),
          brand: get("brand"),
          size: get("size"),
          condition: get("condition"),
          price: get("price"),
          costprice: get("costprice"),
        });
      }
      setRows(dataRows);
    };
    reader.readAsText(f);
  }, []);

  const handleDrag = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
      } else if (e.type === "dragleave") {
        setDragActive(false);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files?.[0]) {
        processFile(e.dataTransfer.files[0]);
      }
    },
    [processFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      processFile(e.target.files[0]);
    }
  };

  const runImport = async () => {
    if (!csvText) return;
    setImporting(true);
    setResult(null);

    try {
      const res = await fetch("/api/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: csvText,
      });
      const data = await res.json();
      setResult(data);
      if (data.imported > 0) {
        toast.success(`Imported ${data.imported} listing${data.imported !== 1 ? "s" : ""}`);
      }
      if (data.errors?.length > 0) {
        toast.error(`${data.errors.length} row${data.errors.length !== 1 ? "s" : ""} had errors`);
      }
    } catch {
      toast.error("Import failed");
    }
    setImporting(false);
  };

  const downloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "crosslist-import-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Template CSV downloaded");
  };

  const reset = () => {
    setFile(null);
    setCsvText("");
    setHeaders([]);
    setRows([]);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const missingHeaders = EXPECTED_HEADERS.filter(
    (h) => !headers.includes(h) && h !== "costprice"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeInUp>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Bulk Import</h1>
            <p className="text-muted-foreground text-sm">
              Import multiple listings from a CSV file
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-1.5" />
            Download Template
          </Button>
        </div>
      </FadeInUp>

      {/* Instructions */}
      <FadeInUp delay={0.05}>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              CSV Format
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Your CSV should include a header row with the following columns:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {EXPECTED_HEADERS.map((h) => (
                  <code
                    key={h}
                    className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-mono"
                  >
                    {h}
                  </code>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                <strong>Required:</strong> title, price.{" "}
                <strong>Optional:</strong> description, category, brand, size,
                condition, costprice.
              </p>
            </div>
          </CardContent>
        </Card>
      </FadeInUp>

      {/* Upload Zone */}
      {!file && (
        <FadeInUp delay={0.1}>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center py-16 px-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-border/60 hover:border-primary/40 hover:bg-muted/20"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  className={`p-4 rounded-2xl mb-4 transition-colors ${
                    dragActive ? "bg-primary/10" : "bg-muted/30"
                  }`}
                >
                  <Upload
                    className={`h-10 w-10 ${
                      dragActive
                        ? "text-primary"
                        : "text-muted-foreground/40"
                    }`}
                  />
                </div>
                <p className="font-medium text-sm">
                  {dragActive
                    ? "Drop your CSV file here"
                    : "Drag and drop your CSV file here"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  or click to browse
                </p>
              </div>
            </CardContent>
          </Card>
        </FadeInUp>
      )}

      {/* Preview */}
      {file && rows.length > 0 && !result && (
        <FadeInUp delay={0.1}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileUp className="h-5 w-5 text-primary" />
                  Preview: {file.name}
                  <Badge variant="outline" className="text-xs">
                    {rows.length} row{rows.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={reset}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Missing headers warning */}
              {missingHeaders.length > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">Missing optional columns:</p>
                    <p className="text-xs mt-0.5">
                      {missingHeaders.join(", ")} — default values will be used
                    </p>
                  </div>
                </div>
              )}

              {/* Preview table */}
              <div className="max-h-80 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 20).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-muted-foreground text-xs">
                          {i + 1}
                        </TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {row.title || (
                            <span className="text-red-500 text-xs">
                              Missing
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.category || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.brand || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.size || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.condition || "Good"}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.price ? (
                            `$${row.price}`
                          ) : (
                            <span className="text-red-500 text-xs">
                              Missing
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {row.costprice ? `$${row.costprice}` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {rows.length > 20 && (
                <p className="text-xs text-muted-foreground text-center">
                  Showing first 20 of {rows.length} rows
                </p>
              )}

              {/* Import Button */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={runImport}
                  disabled={importing}
                  className="h-10"
                >
                  {importing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  Import {rows.length} Listing{rows.length !== 1 ? "s" : ""}
                </Button>
                <Button variant="outline" onClick={reset} className="h-10">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeInUp>
      )}

      {/* Results */}
      {result && (
        <FadeInUp delay={0.1}>
          <StaggerContainer className="space-y-4">
            {/* Success card */}
            <StaggerItem>
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-3 rounded-xl ${
                        result.imported > 0
                          ? "bg-emerald-500/10"
                          : "bg-amber-500/10"
                      }`}
                    >
                      {result.imported > 0 ? (
                        <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {result.imported > 0
                          ? "Import Complete"
                          : "Import Finished with Issues"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {result.imported} listing
                        {result.imported !== 1 ? "s" : ""} imported
                        successfully
                        {result.errors.length > 0 &&
                          `, ${result.errors.length} error${
                            result.errors.length !== 1 ? "s" : ""
                          }`}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={reset}>
                      Import More
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>

            {/* Errors */}
            {result.errors.length > 0 && (
              <StaggerItem>
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-red-600 dark:text-red-400">
                      <AlertCircle className="h-5 w-5" />
                      Errors ({result.errors.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1.5 max-h-60 overflow-auto">
                      {result.errors.map((err, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 p-2 rounded-lg bg-red-500/5 text-sm"
                        >
                          <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                          <span className="text-muted-foreground">{err}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            )}
          </StaggerContainer>
        </FadeInUp>
      )}
    </div>
  );
}
