import { expect, test, type Page } from '@playwright/test';

async function openEditor(page: Page) {
  await page.goto('/?tab=estudio');
  await expect(page.getByRole('heading', { name: 'Ingeniería Jurídica', exact: true })).toBeVisible();
  const status = page.getByRole('status', { name: 'Estado del borrador' });
  await expect(status).toHaveAttribute('data-status', /^(empty|saved)$/);
  const closeCatalog = page.getByRole('button', { name: 'Cerrar catálogo' });
  if (await status.getAttribute('data-status') === 'empty' && (page.viewportSize()?.width ?? 0) >= 640) {
    await closeCatalog.click();
  }
  await expect(page.getByLabel('Título del documento', { exact: true })).toBeEnabled();
}

async function openSettings(page: Page) {
  const options = page.getByRole('button', { name: 'Más opciones', exact: true });
  if (await options.isVisible()) await options.click();
  await page.getByRole('button', { name: 'Ajustes del editor', exact: true }).filter({ visible: true }).click();
  return page.getByRole('dialog', { name: 'Ajustes del editor', exact: true });
}

test('descarga explícita, arranque offline y conservación de borrador y fuentes', async ({ page, context }) => {
  await openEditor(page);
  const manifest = await page.evaluate(async () => {
    const href = document.querySelector<HTMLLinkElement>('link[rel=manifest]')!.href;
    return (await fetch(href)).json();
  });
  expect(manifest.start_url).toBe('/?tab=estudio');
  expect(manifest.id).toBe('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  const editor = page.getByLabel('Contenido editable del documento');
  await editor.fill('BORRADOR OFFLINE: conservar cláusula y fuentes.');
  await page.getByLabel('Título del documento', { exact: true }).fill('Contrato móvil offline');
  await expect(page.getByRole('status', { name: 'Estado del borrador' })).toHaveAttribute('data-status', 'saved');
  const settings = await openSettings(page);
  await settings.getByRole('button', { name: 'Descargar corpus y motor' }).click();
  await expect(settings.getByText('Corpus y motor completos: disponibles sin conexión.')).toBeVisible({ timeout: 30_000 });
  await settings.getByRole('button', { name: 'Cerrar ajustes' }).click();
  await context.setOffline(true);
  await page.close();
  const offline = await context.newPage();
  await openEditor(offline);
  await expect(offline.getByLabel('Título del documento', { exact: true })).toHaveValue('Contrato móvil offline');
  await expect(offline.getByLabel('Contenido editable del documento')).toContainText('BORRADOR OFFLINE');
  await offline.getByRole('button', { name: 'Fundamentar cita legal', exact: true }).click();
  const search = offline.getByRole('dialog', { name: 'Asistente de Fundamentación Legal' });
  await search.getByRole('searchbox').fill('artículo 47');
  await search.getByLabel('Área jurídica').selectOption('laboral');
  await search.getByRole('button', { name: 'Consultar', exact: true }).click();
  await expect(search.getByRole('link', { name: 'Fuente oficial' }).first()).toBeVisible();
  await search.getByRole('button', { name: 'Nota al Pie', exact: true }).first().click();
  await search.getByRole('button', { name: 'Cerrar asistente' }).click();
  await expect(offline.getByRole('region', { name: 'Notas al pie y apéndice de fundamentación legal' })).toContainText('Ley Federal del Trabajo');
  await expect(offline.getByRole('status', { name: 'Estado del borrador' })).toHaveAttribute('data-status', 'saved');
  await offline.reload();
  await expect(offline.getByLabel('Contenido editable del documento')).toContainText('BORRADOR OFFLINE');
  await expect(offline.getByRole('region', { name: 'Notas al pie y apéndice de fundamentación legal' })).toContainText('Ley Federal del Trabajo');
  await offline.getByText('Exportar', { exact: true }).filter({ visible: true }).count().then(async (count) => {
    if (count) await offline.getByText('Exportar', { exact: true }).filter({ visible: true }).click();
    else await offline.getByRole('button', { name: 'Exportar', exact: true }).click();
  });
  const download = offline.waitForEvent('download');
  await offline.getByRole('button', { name: 'Texto plano (.txt)' }).filter({ visible: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.txt$/);
  expect(await offline.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('BYOK se puede probar, reemplazar y eliminar; IA exige acción explícita', async ({ page }) => {
  const requests: string[] = [];
  await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
    const body = route.request().postDataJSON();
    const prompt = body.contents[0].parts[0].text as string;
    requests.push(prompt);
    const citation = prompt.match(/Fuente 1: \[([^\]]+)\]/)?.[1];
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: citation ? `Fundamento de prueba [${citation}].` : 'OK' }] } }],
    }) });
  });
  await openEditor(page);
  await page.getByLabel('Contenido editable del documento').fill('CONTENIDO RESERVADO NO AUTORIZADO');
  const settings = await openSettings(page);
  await settings.getByRole('button', { name: 'Configurar IA BYOK' }).click();
  const byok = page.getByRole('dialog', { name: 'Configuración de IA y clave BYOK' });
  await byok.getByLabel('Tu API key de Gemini').fill('test-key-not-real-1234567890');
  await byok.getByRole('button', { name: 'Probar conexión' }).click();
  await expect(byok.getByText(/Conexión verificada/)).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).not.toContain('CONTENIDO RESERVADO');
  await byok.getByRole('button', { name: 'Guardar clave', exact: true }).click();
  await expect(byok.getByText('Hay una clave guardada en este dispositivo.')).toBeVisible();
  await byok.getByRole('button', { name: 'Cerrar configuración' }).click();
  await page.getByRole('button', { name: 'Fundamentar cita legal', exact: true }).click();
  const local = page.getByRole('dialog', { name: 'Asistente de Fundamentación Legal' });
  await local.getByRole('searchbox').fill('artículo 47');
  await local.getByRole('button', { name: 'Fundamentar con IA BYOK' }).click();
  const ai = page.getByRole('dialog', { name: /Fundamentador Jurídico IA/ });
  await ai.getByLabel('Área jurídica').selectOption('laboral');
  expect(requests).toHaveLength(1);
  await ai.getByRole('button', { name: 'Fundamentar', exact: true }).click();
  await expect(ai.getByText(/Fundamento de prueba/)).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[1]).not.toContain('CONTENIDO RESERVADO');
  await ai.getByRole('button', { name: 'Insertar en el documento' }).click();
  await ai.getByRole('button', { name: 'Cerrar fundamentador' }).click();
  await expect(page.getByLabel('Contenido editable del documento')).toContainText('Fundamento de prueba');
  await expect(page.getByLabel('Contenido editable del documento')).toContainText('CONTENIDO RESERVADO');
  const again = await openSettings(page);
  await again.getByRole('button', { name: 'Configurar IA BYOK' }).click();
  await byok.getByLabel('Nueva clave para reemplazar la guardada').fill('replacement-not-real-1234567890');
  await byok.getByRole('button', { name: 'Guardar reemplazo' }).click();
  await expect(byok.getByText(/Clave guardada\./)).toBeVisible();
  await byok.getByRole('button', { name: 'Eliminar clave' }).click();
  await expect(byok.getByText('No hay una clave guardada.')).toBeVisible();
  await byok.getByRole('button', { name: 'Cerrar configuración' }).click();
  await page.reload();
  const afterReload = await openSettings(page);
  await afterReload.getByRole('button', { name: 'Configurar IA BYOK' }).click();
  await expect(byok.getByText('No hay una clave guardada.')).toBeVisible();
});
