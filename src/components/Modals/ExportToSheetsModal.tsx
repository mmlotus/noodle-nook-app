import React, { useEffect, useState } from "react";
import global from "@/styles/Global.module.css";
import toast from "react-hot-toast";
import { ExpenseForExports, MileageEntryForLog } from "@/types";

type ExportKind = "expenses" | "mileage";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (url: string) => void;

    expenses?: ExpenseForExports[];
    mileageEntries?: MileageEntryForLog[];

    kind?: ExportKind;
}

const monthOptions = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const yearOptions = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 2 + i);

export default function ExportToSheetsModal({
    isOpen,
    onClose,
    expenses = [],
    mileageEntries = [],
    onSuccess,
    kind,
}: Props) {
    const [month, setMonth] = useState("");
    const [year, setYear] = useState<number | "">("");
    const [templateId, setTemplateId] = useState("");
    const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(false);

    const exportKind: ExportKind =
        kind || (mileageEntries.length > 0 ? "mileage" : "expenses");

    const rows = exportKind === "mileage" ? mileageEntries : expenses;

    useEffect(() => {
        if (!isOpen) return;

        const fetchTemplates = async () => {
            try {
                setTemplateId("");
                setTemplates([]);

                const res = await fetch(`/api/export/list-templates?kind=${exportKind}`);
                const data = await res.json();

                if (res.ok && data.templates) {
                    setTemplates(data.templates);
                } else {
                    toast.error(data.error || "Failed to load templates.");
                }
            } catch (err) {
                console.error(err);
                toast.error("Error fetching template list.");
            }
        };

        fetchTemplates();
    }, [isOpen, exportKind]);

    const handleExport = async () => {
        if (!month || !year || !templateId) {
            toast.error("Please select month, year, & template.");
            return;
        }

        if (rows.length === 0) {
            toast.error(exportKind === "mileage" ? "No mileage entries selected." : "No expenses selected.");
            return;
        }

        const uniqueOrgs = [...new Set(rows.map((row) => row.org).filter(Boolean))];

        if (uniqueOrgs.length > 1) {
            toast.error(exportKind === "mileage"
                ? "Selected mileage entries belong to multiple orgs."
                : "Selected expenses belong to multiple orgs."
            );
            return;
        }

        const org = uniqueOrgs[0] || "";

        const sheetName = exportKind === "mileage"
            ? `${month} ${year} Mileage Report`
            : `${month} ${year} Expense Report`;

        const endpoint = exportKind === "mileage"
            ? "/api/export/export-to-sheets-mileage"
            : "/api/export/export-to-sheets";

        setLoading(true);

        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    templateId,
                    month,
                    year,
                    sheetName,
                    org,
                    ...(exportKind === "mileage" ? { mileageEntries } : { expenses }),
                }),
            });

            const data = await res.json();

            if (res.ok && data.sheetUrl) {
                onSuccess(data.sheetUrl);
                onClose();
            } else if (data.error === "MULTIPLE_MONTHS_SELECTED") {
                toast.error(exportKind === "mileage"
                    ? "Please select mileage entries from a single month only."
                    : "Please select expenses from a single month only."
                );
            } else {
                throw new Error(data.error || "Export failed.");
            }
        } catch (err) {
            console.error("Export error:", err);
            toast.error("Something went wrong during export.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={global.modalOverlay}>
            <div className={global.modalWide}>
                <h2 className={global.heading}>Export to Google Sheets</h2>

                <div className={global.inputGroup}>
                    <label className={global.label}>Select Month</label>
                    <select className={global.input} value={month} onChange={(e) => setMonth(e.target.value)}>
                        <option value="">-- Choose Month --</option>
                        {monthOptions.map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>

                    <label className={global.label}>Select Year</label>
                    <select
                        className={global.input}
                        value={year}
                        onChange={(e) => {
                            const value = e.target.value;
                            setYear(value ? Number(value) : "");
                        }}
                    >
                        <option value="">-- Choose Year --</option>
                        {yearOptions.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    <label className={global.label}>Select Template</label>
                    <select
                        className={global.input}
                        value={templateId}
                        onChange={(e) => setTemplateId(e.target.value)}
                    >
                        <option value="">-- Choose Template --</option>
                        {templates.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={global.modalActions}>
                    <button className={global.button} onClick={handleExport} disabled={loading}>{loading ? "Exporting..." : "Export"}</button>
                    <button className={global.buttonSecondary} onClick={onClose} disabled={loading}>Cancel</button>
                </div>
            </div>
        </div>
    )
}