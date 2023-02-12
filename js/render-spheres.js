class RenderSpheres {
	static $getRenderedSphere (it) {
		return $$`${Renderer.utils.getBorderTr()}
		${Renderer.utils.getExcludedTr({entity: it, dataProp: "sphere"})}
		${Renderer.utils.getNameTr(it, {page: UrlUtil.PG_SPHERES})}
		${it.prerequisite ? `<tr><td colspan="6"><i>${Renderer.utils.getPrerequisiteHtml(it.prerequisite)}</i></td></tr>` : ""}
		<tr><td class="divider" colspan="6"><div></div></td></tr>
		<tr><td colspan="6">${Renderer.get().render({entries: it.entries}, 1)}</td></tr>
		${Renderer.sphere.getPreviouslyPrintedText(it)}
		${Renderer.utils.getPageTr(it)}
		${Renderer.utils.getBorderTr()}`;
	}
}
