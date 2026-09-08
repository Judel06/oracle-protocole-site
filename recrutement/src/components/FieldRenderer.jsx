import YesNo from './fields/YesNo';
import CheckboxGroup, { CheckboxGroupBool } from './fields/CheckboxGroup';
import RatingGrid, { RatingSingle } from './fields/RatingGrid';
import LanguageGrid from './fields/LanguageGrid';
import AvailabilityMatrix from './fields/AvailabilityMatrix';
import SizeGrid from './fields/SizeGrid';
import ToolLevelGrid from './fields/ToolLevelGrid';
import DynamicList from './fields/DynamicList';
import ReferencesList from './fields/ReferencesList';
import SocialLinks from './fields/SocialLinks';
import FileUpload from './fields/FileUpload';
import SignaturePad from './fields/SignaturePad';
import Recap from './fields/Recap';

/**
 * Rend un champ selon sa configuration (voir config/steps.js). Gere aussi
 * la logique conditionnelle (conditionalOn / conditionalOnNot) et les
 * lignes groupees (type "row").
 */
export default function FieldRenderer({ field, formData, onFieldChange, errors, candidatId }) {
  if (field.conditionalOn && !formData[field.conditionalOn]) return null;
  if (field.conditionalOnNot && formData[field.conditionalOnNot]) return null;

  if (field.type === 'row') {
    return (
      <div className="field-row">
        {field.fields.map((f) => (
          <FieldRenderer key={f.key} field={f} formData={formData} onFieldChange={onFieldChange} errors={errors} candidatId={candidatId} />
        ))}
      </div>
    );
  }

  if (field.type === 'note') {
    return <p className="field-help" style={{ background: 'var(--navy-soft)', padding: 12, borderRadius: 6 }}>{field.text}</p>;
  }

  if (field.type === 'recap') {
    return <Recap formData={formData} />;
  }

  const value = formData[field.key];
  const set = (v) => onFieldChange(field.key, v);
  const error = errors?.[field.key];

  const wrap = (input) => (
    <div className={`field-block ${error ? 'has-error' : ''}`}>
      {field.label && (
        <label className="field-label">{field.label} {field.required && <span className="required-star">*</span>}</label>
      )}
      {input}
      {error && <p className="field-error">{error}</p>}
    </div>
  );

  switch (field.type) {
    case 'text': case 'email': case 'tel': case 'date': case 'number':
      return wrap(<input type={field.type} value={value ?? ''} onChange={(e) => set(field.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)} />);

    case 'textarea':
      return wrap(<textarea value={value ?? ''} onChange={(e) => set(e.target.value)} />);

    case 'select': {
      const opts = field.options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
      return wrap(
        <select value={value ?? ''} onChange={(e) => set(e.target.value)}>
          <option value="">Sélectionner…</option>
          {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }

    case 'yesno':
      return wrap(<YesNo value={value} onChange={set} />);

    case 'yesno_simple':
      return (
        <div className={`field-block ${error ? 'has-error' : ''}`}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '.88rem', fontWeight: 600, color: 'var(--navy)' }}>
            <input type="checkbox" checked={Boolean(value)} onChange={(e) => set(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--navy)' }} />
            {field.label} {field.required && <span className="required-star">*</span>}
          </label>
          {error && <p className="field-error">{error}</p>}
        </div>
      );

    case 'checkbox_group':
      return wrap(<CheckboxGroup options={field.options} value={value} onChange={set} />);

    case 'checkbox_group_bool':
      return wrap(<CheckboxGroupBool options={field.options} value={value} onChange={set} />);

    case 'rating_grid':
      return wrap(<RatingGrid items={field.items} value={value} onChange={set} />);

    case 'rating_single':
      return wrap(<RatingSingle value={value} onChange={set} />);

    case 'language_grid':
      return wrap(<LanguageGrid value={value} onChange={set} />);

    case 'availability_matrix':
      return wrap(<AvailabilityMatrix value={value} onChange={set} />);

    case 'size_grid':
      return wrap(<SizeGrid items={field.items} value={value} onChange={set} />);

    case 'tool_level_grid':
      return wrap(<ToolLevelGrid items={field.items} value={value} onChange={set} />);

    case 'dynamic_list':
      return wrap(<DynamicList value={value} onChange={set} placeholder={field.placeholder} />);

    case 'references_list':
      return wrap(<ReferencesList value={value} onChange={set} />);

    case 'social_links':
      return wrap(<SocialLinks value={value} onChange={set} />);

    case 'file':
      return wrap(<FileUpload candidatId={candidatId} docType={field.docType} />);

    case 'signature_pad':
      return wrap(<SignaturePad value={formData.signature_image_data} onChange={(v) => onFieldChange('signature_image_data', v)} />);

    case 'consent':
      return (
        <div className="consent-item">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => set(e.target.checked)} />
          <p>{field.label} {field.required && <span className="required-star">*</span>}</p>
        </div>
      );

    default:
      return null;
  }
}
