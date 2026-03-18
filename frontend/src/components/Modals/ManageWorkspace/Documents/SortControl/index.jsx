import { useTranslation } from "react-i18next";

export default function SortControl({
  sortState,
  setSortState,
  idPrefix = "documents",
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-x-2">
      <label className="sr-only" htmlFor={`${idPrefix}-sort-by`}>
        {t("connectors.directory.sort-by")}
      </label>
      <select
        id={`${idPrefix}-sort-by`}
        value={sortState.sortBy}
        onChange={(event) =>
          setSortState((current) => ({
            ...current,
            sortBy: event.target.value,
          }))
        }
        className="h-8 rounded-lg border border-theme-modal-border bg-theme-settings-input-bg text-theme-text-primary text-xs px-2.5 outline-none focus:ring-1 focus:ring-primary-button"
      >
        <option value="name">{t("connectors.directory.sort-name")}</option>
        <option value="date">{t("connectors.directory.sort-date")}</option>
        <option value="type">{t("connectors.directory.sort-type")}</option>
      </select>

      <label className="sr-only" htmlFor={`${idPrefix}-sort-direction`}>
        {t("connectors.directory.sort-direction")}
      </label>
      <select
        id={`${idPrefix}-sort-direction`}
        value={sortState.sortDirection}
        onChange={(event) =>
          setSortState((current) => ({
            ...current,
            sortDirection: event.target.value,
          }))
        }
        className="h-8 rounded-lg border border-theme-modal-border bg-theme-settings-input-bg text-theme-text-primary text-xs px-2.5 outline-none focus:ring-1 focus:ring-primary-button"
      >
        <option value="asc">{t("connectors.directory.sort-asc")}</option>
        <option value="desc">{t("connectors.directory.sort-desc")}</option>
      </select>
    </div>
  );
}
