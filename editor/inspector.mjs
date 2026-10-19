import { tapFields } from "../engine/tokens.mjs";
export const getPath = (o, p) => p.split(".").reduce((a, k) => a?.[k], o);
export function setPath(o, p, v) {
  const keys = p.split(".");
  let at = o;
  for (const k of keys.slice(0, -1)) at = at[k] ??= {};
  at[keys.at(-1)] = v;
}
const same = (a, b) => JSON.stringify(sort(a)) === JSON.stringify(sort(b));
function sort(v) {
  return v && typeof v === "object" && !Array.isArray(v)
    ? Object.fromEntries(
        Object.keys(v)
          .sort()
          .map((k) => [k, sort(v[k])]),
      )
    : v;
}
export function renderInspector({
  project,
  parameters,
  draft,
  group,
  onGroup,
  onChange,
  onApply,
}) {
  const tabs = document.querySelector("#tabs"),
    form = document.querySelector("#inspector");
  const groups = [
    ...(project.editor?.groups || []),
    { id: "tap", label: "Tap", fields: tapFields },
  ];
  if (!groups.some((g) => g.id === group)) group = groups[0].id;
  tabs.replaceChildren();
  for (const g of groups) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = `tab-${g.id}`;
    button.role = "tab";
    button.setAttribute("aria-selected", g.id === group);
    button.setAttribute("aria-controls", "inspector");
    button.tabIndex = g.id === group ? 0 : -1;
    button.textContent = g.label;
    if (g.id === "motion")
      button.title =
        "Исходные параметры при 1×; фактическое время — у выбранного действия";
    button.onclick = () => onGroup(g.id);
    button.onkeydown = (e) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      const i = groups.indexOf(g),
        n =
          e.key === "Home"
            ? 0
            : e.key === "End"
              ? groups.length - 1
              : (i + (e.key === "ArrowRight" ? 1 : -1) + groups.length) %
                groups.length;
      onGroup(groups[n].id);
      document.getElementById(`tab-${groups[n].id}`).focus();
    };
    tabs.append(button);
  }
  form.replaceChildren();
  form.setAttribute("aria-labelledby", `tab-${group}`);
  for (const field of groups.find((g) => g.id === group).fields) {
    const label = document.createElement("label"),
      text = document.createElement("span");
    text.textContent = field.label;
    label.append(text);
    const value =
      getPath(draft, field.path) ??
      getPath(parameters, field.path) ??
      field.default;
    let input;
    if (field.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = field.rows || 4;
      label.className = "stack";
      input.value = value ?? "";
    } else if (field.type === "preset") {
      input = document.createElement("select");
      field.options.forEach((opt, i) => {
        const o = document.createElement("option");
        o.value = i;
        o.textContent = opt.label;
        input.append(o);
      });
      input.value = Math.max(
        0,
        field.options.findIndex((o) => same(o.value, value)),
      );
    } else {
      input = document.createElement("input");
      input.type = field.type;
      for (const k of ["min", "max", "step"])
        if (field[k] !== undefined) input[k] = field[k];
      input.value = value ?? "";
      if (field.type === "number") {
        input.required = true;
        input.inputMode = "decimal";
      }
    }
    input.dataset.path = field.path;
    input.setAttribute("aria-label", field.label);
    const wrap = document.createElement("span");
    wrap.className = ["number", "range", "color"].includes(field.type)
      ? `${field.type}-field`
      : "field";
    wrap.append(input);
    let output;
    if (field.type === "number" && field.unit) {
      const unit = document.createElement("span");
      unit.textContent = field.unit;
      unit.setAttribute("aria-hidden", "true");
      wrap.append(unit);
    }
    if (field.type === "range") {
      output = document.createElement("output");
      output.className = "field-value";
      const display = () => {
        output.value =
          field.max === 1
            ? Math.round(Number(input.value) * 100) + "%"
            : input.value;
        input.setAttribute("aria-valuetext", output.value);
      };
      display();
      input.addEventListener("input", display);
      wrap.append(output);
    }
    if (field.type === "color") {
      output = document.createElement("output");
      output.className = "field-value";
      output.value = input.value.toUpperCase();
      input.addEventListener(
        "input",
        () => (output.value = input.value.toUpperCase()),
      );
      wrap.append(output);
    }
    input.addEventListener("input", () => {
      const v =
        field.type === "preset"
          ? structuredClone(field.options[Number(input.value)].value)
          : ["number", "range"].includes(field.type) && input.value !== ""
            ? Number(input.value)
            : input.value;
      onChange(field.path, v);
    });
    label.append(wrap);
    form.append(label);
  }
  const button = document.createElement("button");
  button.type = "submit";
  button.className = "primary apply";
  button.textContent = "Применить";
  button.disabled = true;
  form.append(button);
  const error = document.createElement("p");
  error.id = "inspector-error";
  error.setAttribute("role", "alert");
  error.hidden = true;
  form.append(error);
  form.onsubmit = (e) => {
    e.preventDefault();
    onApply();
  };
  return group;
}
export function isChanged(draft, applied, parameters) {
  const walk = (v, p = "") =>
    Object.entries(v).some(([k, value]) => {
      const path = p ? `${p}.${k}` : k;
      if (value && typeof value === "object" && !Array.isArray(value))
        return walk(value, path);
      return !same(value, getPath(applied, path) ?? getPath(parameters, path));
    });
  return walk(draft);
}
