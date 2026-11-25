"use client";

import { HexColorPicker, HexColorInput } from "react-colorful";
import glob from "@/styles/Global.module.css";

type ColorPickerProps = {
    color: string;
    onChange: (color: string) => void;
    children?: React.ReactNode;
    label?: string;
};

export default function ColorPicker({
    color,
    onChange,
    children,
    label = "Profile Color",
}: ColorPickerProps) {
    return (
        <div className={glob.colorPicker}>
            <div className={glob.colorPickerFields}>
                {children}

                <label className={glob.label}>Hex Code</label>
                <HexColorInput
                    className={glob.input}
                    color={color}
                    onChange={onChange}
                    prefixed
                />
            </div>

            <div className={glob.colorPickerPreview}>
                <label className={glob.label}>{label}</label>
                <HexColorPicker
                    color={color}
                    onChange={onChange}
                />
            </div>
        </div>
    );
}