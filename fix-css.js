const fs = require('fs');
let css = fs.readFileSync('src/app/admin/Admin.module.css', 'utf8');

const anchor = '@media (min-width: 1024px)';
const start = css.indexOf(anchor);
const end = css.indexOf('}', css.indexOf('}', start) + 1) + 1;
css = css.substring(0, end);

css += `

.revenuePanel {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  border: 1px solid #eee;
}

.revenueTitle {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.revenueControls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;
}

.revenueField {
  display: flex;
  align-items: center;
  gap: 15px;
}

.revenueField label {
  font-weight: 500;
  color: #555;
}

.revenueCard {
  background: #fdfbf7;
  padding: 15px 30px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  border: 1px solid #e8e0d5;
}

.revenueLabel {
  font-size: 0.9rem;
  color: #777;
  margin-bottom: 5px;
}

.revenueAmount {
  font-size: 1.8rem;
  font-weight: 700;
  color: #d35400;
}

.chartContainer {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-top: 30px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  border: 1px solid #eee;
}

.chartTitle {
  font-size: 1.1rem;
  font-weight: 600;
  color: #444;
  margin-bottom: 20px;
  text-align: center;
}
`;

fs.writeFileSync('src/app/admin/Admin.module.css', css);
console.log('Fixed CSS cleanly.');
