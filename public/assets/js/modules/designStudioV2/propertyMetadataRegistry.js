const PROPERTY_METADATA = [
    { name: 'fontSize', group: 'Typography', editor: 'number', risk: 'safe', unit: 'px', min: 8, max: 72 },
    { name: 'lineHeight', group: 'Typography', editor: 'number', risk: 'safe', min: 1, max: 3, step: 0.1 },
    { name: 'color', group: 'Typography', editor: 'color', risk: 'safe' },
    { name: 'textAlign', group: 'Alignment', editor: 'select', risk: 'safe', options: ['left', 'center', 'right', 'justify'] },
    { name: 'backgroundColor', group: 'Background', editor: 'color', risk: 'safe' },
    { name: 'padding', group: 'Spacing', editor: 'spacing', risk: 'safe', unit: 'px' },
    { name: 'margin', group: 'Spacing', editor: 'spacing', risk: 'safe', unit: 'px' },
    { name: 'gap', group: 'Spacing', editor: 'number', risk: 'safe', unit: 'px', min: 0, max: 96 },
    { name: 'borderWidth', group: 'Border', editor: 'number', risk: 'safe', unit: 'px', min: 0, max: 24 },
    { name: 'borderRadius', group: 'Border', editor: 'number', risk: 'safe', unit: 'px', min: 0, max: 80 },
    { name: 'shadow', group: 'Shadow', editor: 'select', risk: 'safe', options: ['none', 'sm', 'md', 'lg'] },
    { name: 'opacity', group: 'Typography', editor: 'slider', risk: 'safe', min: 0, max: 1, step: 0.05 },
    { name: 'width', group: 'Size', editor: 'number', risk: 'medium', unit: 'px', min: 0, max: 1600 },
    { name: 'height', group: 'Size', editor: 'number', risk: 'medium', unit: 'px', min: 0, max: 1600 },
    { name: 'minWidth', group: 'Size', editor: 'number', risk: 'medium', unit: 'px', min: 0, max: 1600 },
    { name: 'maxWidth', group: 'Size', editor: 'number', risk: 'medium', unit: 'px', min: 0, max: 1600 },
    { name: 'display', group: 'Layout', editor: 'select', risk: 'medium', options: ['block', 'inline-block', 'flex', 'grid', 'none'] },
    { name: 'flexDirection', group: 'Layout', editor: 'select', risk: 'medium', options: ['row', 'column', 'row-reverse', 'column-reverse'] },
    { name: 'justifyContent', group: 'Alignment', editor: 'select', risk: 'medium', options: ['flex-start', 'center', 'flex-end', 'space-between'] },
    { name: 'alignItems', group: 'Alignment', editor: 'select', risk: 'medium', options: ['stretch', 'flex-start', 'center', 'flex-end'] },
    { name: 'position', group: 'Advanced', editor: 'select', risk: 'high', options: ['static', 'relative', 'absolute', 'fixed', 'sticky'] },
    { name: 'overflow', group: 'Advanced', editor: 'select', risk: 'high', options: ['visible', 'hidden', 'auto', 'scroll'] },
    { name: 'zIndex', group: 'Advanced', editor: 'number', risk: 'high', min: 0, max: 9999 },
    { name: 'transform', group: 'Advanced', editor: 'select', risk: 'high', options: ['none'] },
];

export function listPropertyMetadata({ showHighRisk = false } = {}) {
    return PROPERTY_METADATA.filter((property) => showHighRisk || property.risk !== 'high').map((property) => ({ ...property }));
}

export function getPropertyMetadata(name, options = {}) {
    return listPropertyMetadata(options).find((property) => property.name === name) || null;
}

export function groupPropertyMetadata(options = {}) {
    return listPropertyMetadata(options).reduce((groups, property) => {
        groups[property.group] = groups[property.group] || [];
        groups[property.group].push(property);
        return groups;
    }, {});
}
