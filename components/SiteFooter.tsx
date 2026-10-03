import styles from './SiteFooter.module.css';

export const DISCLAIMER =
  'برينسيس لوحة إعلانات فقط. الاتفاق والدفع يتمّان مباشرة بين الطرفين، والموقع ليس طرفًا في أي تعامل ولا يضمن أي خدمة أو منتج.';

/** The compact footer of the form and detail pages; the detail page adds the disclaimer. */
export function SiteFooter({ withDisclaimer = false }: { withDisclaimer?: boolean }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        {withDisclaimer && <p className={styles.disclaimer}>{DISCLAIMER}</p>}
        <div className={styles.row}>
          <span>برينسيس — مشروع من MDN</span>
          {/* The designs link these to "#": the pages do not exist yet. */}
          <div className={styles.links}>
            <a href="#">الشروط</a>
            <a href="#">الخصوصية</a>
            <a href="#">تواصلي معنا</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
