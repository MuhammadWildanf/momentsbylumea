
                    (function () {
                        try {
                            const urlParams = new URLSearchParams(window.location.search);
                            const eventId = urlParams.get('event') || '';
                            const cacheKey = eventId ? 'vb_config_' + eventId : 'vb_config';
                            const cached = localStorage.getItem(cacheKey);
                            if (cached) {
                                const data = JSON.parse(cached);
                                if (data.title) {
                                    const titleRow = document.querySelector('.names-row');
                                    if (titleRow) {
                                        titleRow.innerHTML = window.formatTitleText(data.title);
                                    }
                                }
                                if (data.idleHeadMode === 'logo' && data.logoUrl) {
                                    document.write('<style>#main-title { display: none !important; } #branding-logo { display: block !important; }</style>');
                                } else {
                                    const mainTitleEl = document.getElementById('main-title');
                                    if (mainTitleEl) mainTitleEl.style.visibility = 'visible';
                                }
                            }
                        } catch (e) { }
                    })();
                