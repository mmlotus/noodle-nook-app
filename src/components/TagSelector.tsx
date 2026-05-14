import tagStyles from "@/styles/Tags.module.css";

type TagSelectorProps = {
  options: string[];
  selected: string[];
  onChange: (newSelected: string[]) => void;
  labelForValue?: (val: string) => string; // optional label renderer
};

export default function TagSelector({ options, selected, onChange, labelForValue }: TagSelectorProps) {
  const handleAdd = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val && !selected.includes(val)) {
      onChange([...selected, val]);
    }
    e.target.selectedIndex = 0; // reset dropdown to placeholder
  };

  const remove = (val: string) => {
    onChange(selected.filter(v => v !== val));
  };

  return (
    <div className={tagStyles.tagSelector}>
      <div className={tagStyles.tags}>
        {selected.map(val => (
          <span key={val} className={tagStyles.tag}>
            {labelForValue ? labelForValue(val) : val}
            <button onClick={() => remove(val)} className={tagStyles.removeBtn}>×</button>
          </span>
        ))}
      </div>
      <select onChange={handleAdd} value="">
        <option value="" disabled>Add...</option>
        {options
          .filter(val => !selected.includes(val))
          .map(val => (
            <option key={val} value={val}>
              {labelForValue ? labelForValue(val) : val}
            </option>
          ))}
      </select>
    </div>
  );
}
