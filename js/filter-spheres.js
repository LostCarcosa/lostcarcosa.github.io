"use strict";

class PageFilterSpheres extends PageFilter {
	// region static
	static _filterFeatureTypeSort (a, b) {
		return SortUtil.ascSort(Parser.sphereTypeToFull(a.item), Parser.sphereTypeToFull(b.item));
	}

	static sortSpheres (itemA, itemB, options) {
		if (options.sortBy === "level") {
			const aValue = Number(itemA.values.level) || 0;
			const bValue = Number(itemB.values.level) || 0;
			return SortUtil.ascSort(aValue, bValue) || SortUtil.listSort(itemA, itemB, options);
		}
		return SortUtil.listSort(itemA, itemB, options);
	}
	// endregion

	constructor () {
		super();

		this._typeFilter = new Filter({
			header: "Sphere Type",
			items: [],
			displayFn: Parser.sphereTypeToFull,
			itemSortFn: PageFilterSpheres._filterSphereTypeSort,
		});
		this._pactFilter = new Filter({
			header: "Pact Boon",
			items: [],
			displayFn: Parser.prereqPactToFull,
		});
		this._patronFilter = new Filter({
			header: "Otherworldly Patron",
			items: [],
			displayFn: Parser.prereqPatronToShort,
		});
		this._spellFilter = new Filter({
			header: "Spell",
			items: [],
			displayFn: StrUtil.toTitleCase,
		});
		this._sphereFilter = new Filter({
			header: "Feature",
			displayFn: StrUtil.toTitleCase,
		});
		this._levelFilter = new Filter({
			header: "Level",
			itemSortFn: SortUtil.ascSortNumericalSuffix,
			nests: [],
		});
		this._prerequisiteFilter = new MultiFilter({
			header: "Prerequisite",
			filters: [
				this._pactFilter,
				this._patronFilter,
				this._spellFilter,
				this._levelFilter,
				this._sphereFilter,
			],
		});
		this._miscFilter = new Filter({header: "Miscellaneous", items: ["SRD", "Grants Additional Spells"], isMiscFilter: true});
	}

	static mutateForFilters (it) {
		it._fSources = SourceFilter.getCompleteFilterSources(it);

		// (Convert legacy string format to array)
		it.sphereType = it.sphereType && it.sphereType instanceof Array ? it.sphereType : it.sphereType ? [it.sphereType] : ["OTH"];
		if (it.prerequisite) {
			it._sPrereq = true;
			it._fPrereqPact = it.prerequisite.filter(it => it.pact).map(it => it.pact);
			it._fPrereqPatron = it.prerequisite.filter(it => it.patron).map(it => it.patron);
			it._fprereqSpell = it.prerequisite.filter(it => it.spell).map(it => {
				return (it.spell || []).map(it => it.split("#")[0].split("|")[0]);
			});
			it._fprereqSphere = it.prerequisite.filter(it => it.sphere).map(it => it.sphere);
			it._fPrereqLevel = it.prerequisite.filter(it => it.level).map(it => {
				const lvlMeta = it.level;

				let item;
				let className;
				if (typeof lvlMeta === "number") {
					className = `(No Class)`;
					item = new FilterItem({
						item: `Level ${lvlMeta}`,
						nest: className,
					});
				} else {
					className = lvlMeta.class ? lvlMeta.class.name : `(No Class)`;
					item = new FilterItem({
						item: `${lvlMeta.class ? className : ""}${lvlMeta.subclass ? ` (${lvlMeta.subclass.name})` : ""} Level ${lvlMeta.level}`,
						nest: className,
					});
				}

				return item;
			});
		}

		it._dSphereType = it.sphereType.map(ft => Parser.sphereTypeToFull(ft));
		it._lSphereType = it.sphereType.join(", ");
		it.sphereType.sort((a, b) => SortUtil.ascSortLower(Parser.sphereTypeToFull(a), Parser.sphereTypeToFull(b)));

		it._fMisc = it.srd ? ["SRD"] : [];
		if (it.additionalSpells) it._fMisc.push("Grants Additional Spells");
	}

	addToFilters (it, isExcluded) {
		if (isExcluded) return;

		this._sourceFilter.addItem(it._fSources);
		this._typeFilter.addItem(it.sphereType);
		this._pactFilter.addItem(it._fPrereqPact);
		this._patronFilter.addItem(it._fPrereqPatron);
		this._spellFilter.addItem(it._fprereqSpell);
		this._sphereFilter.addItem(it._fprereqSphere);

		(it._fPrereqLevel || []).forEach(it => {
			this._levelFilter.addNest(it.nest, {isHidden: true});
			this._levelFilter.addItem(it);
		});
	}

	async _pPopulateBoxOptions (opts) {
		opts.filters = [
			this._sourceFilter,
			this._typeFilter,
			this._prerequisiteFilter,
			this._miscFilter,
		];
	}

	toDisplay (values, it) {
		return this._filterBox.toDisplay(
			values,
			it._fSources,
			it.sphereType,
			[
				it._fPrereqPact,
				it._fPrereqPatron,
				it._fprereqSpell,
				it._fPrereqLevel,
				it._fprereqSphere,
			],
			it._fMisc,
		);
	}
}

class ModalFilterSpheres extends ModalFilter {
	/**
	 * @param opts
	 * @param opts.namespace
	 * @param [opts.isRadio]
	 * @param [opts.allData]
	 */
	constructor (opts) {
		opts = opts || {};
		super({
			...opts,
			modalTitle: `Optional Feature${opts.isRadio ? "" : "s"}`,
			pageFilter: new PageFilterSpheres(),
		});
	}

	_$getColumnHeaders () {
		const btnMeta = [
			{sort: "name", text: "Name", width: "3"},
			{sort: "type", text: "Type", width: "2"},
			{sort: "prerequisite", text: "Prerequisite", width: "4"},
			{sort: "level", text: "Level", width: "1"},
			{sort: "source", text: "Source", width: "1"},
		];
		return ModalFilter._$getFilterColumnHeaders(btnMeta);
	}

	async _pLoadAllData () {
		const brew = await BrewUtil2.pGetBrewProcessed();
		const fromData = (await DataUtil.loadJSON(`${Renderer.get().baseUrl}data/spheres.json`)).sphere;
		const fromBrew = brew.sphere || [];
		return [...fromData, ...fromBrew];
	}

	_getListItem (pageFilter, sphere, ftI) {
		const eleRow = document.createElement("div");
		eleRow.className = "px-0 w-100 ve-flex-col no-shrink";

		const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_SPHERE](sphere);
		const source = Parser.sourceJsonToAbv(sphere.source);
		const prerequisite = Renderer.utils.getPrerequisiteHtml(sphere.prerequisite, {isListMode: true, blocklistKeys: new Set(["level"])});
		const level = Renderer.sphere.getListPrerequisiteLevelText(sphere.prerequisite);

		eleRow.innerHTML = `<div class="w-100 ve-flex-vh-center lst--border veapp__list-row no-select lst__wrp-cells ${sphere._versionBase_isVersion ? "ve-muted" : ""}">
			<div class="col-0-5 pl-0 ve-flex-vh-center">${this._isRadio ? `<input type="radio" name="radio" class="no-events">` : `<input type="checkbox" class="no-events">`}</div>

			<div class="col-0-5 px-1 ve-flex-vh-center">
				<div class="ui-list__btn-inline px-2" title="Toggle Preview (SHIFT to Toggle Info Preview)">[+]</div>
			</div>

			<div class="col-3 ${this._getNameStyle()}">${sphere.name}</div>
			<span class="col-2 text-center" title="${sphere._dSphereType}">${sphere._lSphereType}</span>
			<span class="col-4 text-center">${prerequisite}</span>
			<span class="col-1 text-center">${level}</span>
			<div class="col-1 pr-0 text-center ${Parser.sourceJsonToColor(sphere.source)}" title="${Parser.sourceJsonToFull(sphere.source)}" ${BrewUtil2.sourceJsonToStyle(sphere.source)}>${source}</div>
		</div>`;

		const btnShowHidePreview = eleRow.firstElementChild.children[1].firstElementChild;

		const listItem = new ListItem(
			ftI,
			eleRow,
			sphere.name,
			{
				hash,
				source,
				sourceJson: sphere.source,
				prerequisite,
				level,
				type: sphere._lSphereType,
			},
			{
				cbSel: eleRow.firstElementChild.firstElementChild.firstElementChild,
				btnShowHidePreview,
			},
		);

		ListUiUtil.bindPreviewButton(UrlUtil.PG_FEATS, this._allData, listItem, btnShowHidePreview);

		return listItem;
	}
}
