
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('event') || '';
        const cacheKey = eventId ? 'vb_config_' + eventId : 'vb_config';
        if (!urlParams.has('event')) {
            document.documentElement.classList.add('show-landing');
        }

        window.formatTitleText = function (title) {
            if (!title) return '';
            const match = title.match(/(?:<[^>]+>)*\s+(and|dan|bersama)\s+(?:<[^>]+>)*/i) || 
                          title.match(/(?:<[^>]+>)*\s*(&|\+)\s*(?:<[^>]+>)*/);
            if (match) {
                const connectorHtml = match[0];
                const parts = title.split(connectorHtml);
                return '<span>' + parts[0].trim() + '</span> <span class="title-amp">' + connectorHtml.trim() + '</span> <span>' + parts.slice(1).join(connectorHtml).trim() + '</span>';
            }
            return '<span>' + title + '</span>';
        };
        window.applyThemeColors = function (data, target) {
            if (!target) return;
            const styleObj = target.style || target;
            if (typeof styleObj.setProperty !== 'function') return;
            const mappings = {
                accentColor: '--accent',
                titleColor: '--title-color',
                subtitleColor: '--subtitle-color',
                connectorColor: '--connector-color',
                descColor: '--desc-color',
                startTextColor: '--start-text-color',
                readyTextColor: '--ready-text-color',
                reviewTextColor: '--review-text-color',
                successTextColor: '--success-text-color',
                formLabelNameColor: '--form-label-color',
                formSubmitTextColor: '--form-submit-color',
                readyHeaderTitleColor: '--ready-header-title-color',
                readyHeaderSubtitleColor: '--ready-header-subtitle-color',
                readyBackTextColor: '--ready-back-color',
                reviewRetakeTextColor: '--review-retake-color',
                reviewPhotoTextColor: '--review-photo-color',
                photoHeaderTitleColor: '--photo-header-title-color',
                photoHeaderSubtitleColor: '--photo-header-subtitle-color',
                photoInstructionTextColor: '--photo-instruction-color',
                photoBackTextColor: '--photo-back-color',
                finalHeaderTitleColor: '--final-header-title-color',
                finalRetakeAllTextColor: '--final-retake-all-color',
                finalRetakePhotoTextColor: '--final-retake-photo-color',
                finalUploadTextColor: '--final-upload-color',
                successFooterTextColor: '--success-footer-color',
                successDoneTextColor: '--success-done-color',
                startBtnBgColor: '--start-btn-bg',
                formSubmitBtnBgColor: '--form-submit-btn-bg',
                readyRecordBtnBgColor: '--ready-record-btn-bg',
                reviewPhotoBtnBgColor: '--review-photo-btn-bg',
                photoRecordBtnBgColor: '--photo-record-btn-bg',
                photoBackBtnBgColor: '--photo-back-btn-bg',
                readyRecordBtnTextColor: '--ready-record-btn-text',
                readyBackBtnBgColor: '--ready-back-btn-bg',
                reviewRetakeBtnBgColor: '--review-retake-btn-bg',
                photoRecordBtnTextColor: '--photo-record-btn-text',
                finalRetakeAllBtnBgColor: '--final-retake-all-btn-bg',
                finalRetakePhotoBtnBgColor: '--final-retake-photo-btn-bg',

                finalUploadBtnBgColor: '--final-upload-btn-bg',
                successDoneBtnBgColor: '--success-done-btn-bg',
                recordingBtnBgColor: '--recording-btn-bg'
            };
            for (const key in mappings) {
                if (data[key]) {
                    const variableName = mappings[key];
                    const val = data[key];
                    if (typeof styleObj.getPropertyValue === 'function') {
                        if (styleObj.getPropertyValue(variableName) !== val) {
                            styleObj.setProperty(variableName, val);
                        }
                    } else {
                        styleObj.setProperty(variableName, val);
                    }
                }
            }
        };

        window.updateConfigurableTexts = function (data) {
            if (!data) return;

            // Form State
            const formLabel = document.getElementById('form-label-name');
            if (formLabel && data.formLabelName) formLabel.innerHTML = data.formLabelName;

            const nameInput = document.getElementById('name');
            if (nameInput && data.formPlaceholderName) nameInput.placeholder = data.formPlaceholderName;

            const formSubmit = document.getElementById('form-submit-text');
            if (formSubmit && data.formSubmitText) formSubmit.innerHTML = data.formSubmitText;

            // Ready State
            const readyTitle = document.getElementById('ready-header-title');
            if (readyTitle && data.readyHeaderTitle) readyTitle.innerHTML = data.readyHeaderTitle;

            const readySubtitle = document.getElementById('ready-header-subtitle');
            if (readySubtitle && data.readyHeaderSubtitle) readySubtitle.innerHTML = data.readyHeaderSubtitle;

            const readyBack = document.getElementById('ready-back-text');
            if (readyBack && data.readyBackText) readyBack.innerHTML = data.readyBackText;

            // Review Video State
            const reviewRetake = document.getElementById('review-retake-text');
            if (reviewRetake && data.reviewRetakeText) reviewRetake.innerHTML = data.reviewRetakeText;

            const reviewPhoto = document.getElementById('review-photo-text');
            if (reviewPhoto && data.reviewPhotoText) reviewPhoto.innerHTML = data.reviewPhotoText;

            // Ready Photo State
            const photoTitle = document.getElementById('photo-header-title');
            if (photoTitle && data.photoHeaderTitle) photoTitle.innerHTML = data.photoHeaderTitle;

            const photoSubtitle = document.getElementById('photo-header-subtitle');
            if (photoSubtitle && data.photoHeaderSubtitle) photoSubtitle.innerHTML = data.photoHeaderSubtitle;

            const photoMain = document.getElementById('photo-instruction-main');
            if (photoMain && data.photoInstructionMain) photoMain.innerHTML = data.photoInstructionMain;

            const photoSub = document.getElementById('photo-instruction-sub');
            if (photoSub && data.photoInstructionSub) photoSub.innerHTML = data.photoInstructionSub;

            const photoBack = document.getElementById('photo-back-text');
            if (photoBack && data.photoBackText) photoBack.innerHTML = data.photoBackText;

            // Review Final State
            const finalTitle = document.getElementById('final-header-title');
            if (finalTitle && data.finalHeaderTitle) finalTitle.innerHTML = data.finalHeaderTitle;

            const videoLabel = document.getElementById('final-video-label');
            if (videoLabel && data.finalVideoLabel) videoLabel.innerHTML = data.finalVideoLabel;

            const photoLabel = document.getElementById('final-photo-label');
            if (photoLabel && data.finalPhotoLabel) photoLabel.innerHTML = data.finalPhotoLabel;

            const finalRetakeAll = document.getElementById('final-retake-all-text');
            if (finalRetakeAll && data.finalRetakeAllText) finalRetakeAll.innerHTML = data.finalRetakeAllText;

            const finalRetakePhoto = document.getElementById('final-retake-photo-text');
            if (finalRetakePhoto && data.finalRetakePhotoText) finalRetakePhoto.innerHTML = data.finalRetakePhotoText;

            const finalUpload = document.getElementById('final-upload-text');
            if (finalUpload && data.finalUploadText) finalUpload.innerHTML = data.finalUploadText;

            // Success State
            const successFooter = document.getElementById('success-footer-text');
            if (successFooter && data.successFooterText) successFooter.innerHTML = data.successFooterText;

            const successDone = document.getElementById('success-done-text');
            if (successDone && data.successDoneText) successDone.innerHTML = data.successDoneText;

            // Split Instruction texts
            const readyMain = document.getElementById('ready-text-main');
            if (readyMain && data.readyTextMain) readyMain.innerHTML = data.readyTextMain;

            const readySub = document.getElementById('ready-text-sub');
            if (readySub && data.readyTextSub) readySub.innerHTML = data.readyTextSub;

            const reviewMain = document.getElementById('review-text-main');
            if (reviewMain && data.reviewTextMain) reviewMain.innerHTML = data.reviewTextMain;

            const reviewSub = document.getElementById('review-text-sub');
            if (reviewSub && data.reviewTextSub) reviewSub.innerHTML = data.reviewTextSub;

            const successMain = document.getElementById('success-text-main');
            if (successMain && data.successTextMain) successMain.innerHTML = data.successTextMain;

            const successSub = document.getElementById('success-text-sub');
            if (successSub && data.successTextSub) successSub.innerHTML = data.successTextSub;

            // New dynamic panel & loading texts
            const previewFooter = document.getElementById('preview-panel-footer');
            if (previewFooter && data.previewPanelFooter) previewFooter.innerHTML = data.previewPanelFooter;

            const loadingPreview = document.getElementById('loading-preview-text');
            if (loadingPreview && data.loadingPreviewText) loadingPreview.innerHTML = data.loadingPreviewText;

            const loadingTutorial = document.getElementById('loading-tutorial-text');
            if (loadingTutorial && data.loadingTutorialText) loadingTutorial.innerHTML = data.loadingTutorialText;

            const countdownArea = document.getElementById('countdown-area');
            if (countdownArea && data.readyCountdownText && (countdownArea.innerHTML === 'Start Recording' || countdownArea.innerHTML === data.readyCountdownText)) {
                countdownArea.innerHTML = data.readyCountdownText;
            }

            const countdownPhotoArea = document.getElementById('countdown-area-photo');
            if (countdownPhotoArea && data.photoCountdownText && (countdownPhotoArea.innerHTML === 'Take a Photo' || countdownPhotoArea.innerHTML === data.photoCountdownText)) {
                countdownPhotoArea.innerHTML = data.photoCountdownText;
            }
        };

        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const data = JSON.parse(cached);
                const root = document.documentElement;
                if (data.bgImageUrl && data.bgImageUrl !== 'none' && data.bgImageUrl !== 'Default') {
                    document.write('<style>body { background-image: url("' + data.bgImageUrl + '") !important; background-size: cover !important; }</style>');
                } else {
                    document.write('<style>body { background-image: radial-gradient(circle at center, var(--bg-1, #1a0f0a) 0%, var(--bg-2, #100a06) 100%) !important; }</style>');
                }
                if (data.frameImageUrl) {
                    root.style.setProperty('--frame-image', 'url("' + data.frameImageUrl + '")');
                }
                window.applyThemeColors(data, root);
                if (data.frameColor) root.style.setProperty('--frame', data.frameColor);
                if (data.bgColor1) root.style.setProperty('--bg-1', data.bgColor1);
                if (data.bgColor2) root.style.setProperty('--bg-2', data.bgColor2);
                if (data.fontFamily) root.style.setProperty('--body-font-dyn', data.fontFamily);
                root.style.setProperty('--font-style-sub', 'normal');

                 if (data.fontUrl && data.fontFamily) {
                    const isDirectFont = /\.(ttf|otf|woff|woff2)(\?.*)?$/i.test(data.fontUrl);
                    if (isDirectFont) {
                        let format = 'truetype';
                        if (data.fontUrl.toLowerCase().includes('.otf')) format = 'opentype';
                        else if (data.fontUrl.toLowerCase().includes('.woff2')) format = 'woff2';
                        else if (data.fontUrl.toLowerCase().includes('.woff')) format = 'woff';
                        document.write('<style>@font-face { font-family: ' + data.fontFamily + '; src: url("' + data.fontUrl + '") format("' + format + '"); font-weight: normal; font-style: normal; } :root { --body-font-dyn: ' + data.fontFamily + '; } body, input, button, textarea, .subtitle-premium, .desc-premium, .panel-footer, .ui-state h2, .delivery-tab { font-family: ' + data.fontFamily + ' !important; }</style>');
                    } else {
                        document.write('<style>@import url("' + data.fontUrl + '"); :root { --body-font-dyn: ' + data.fontFamily + '; } body, input, button, textarea, .subtitle-premium, .desc-premium, .panel-footer, .ui-state h2, .delivery-tab { font-family: ' + data.fontFamily + ' !important; }</style>');
                    }
                }
                if (data.titleFontFamily) {
                    root.style.setProperty('--title-font-dyn', data.titleFontFamily);
                }
                if (data.showLeftPanel === false) {
                    document.write('<style>body.state-idle #panel-left, body.state-form #panel-left { display: none !important; }</style>');
                }
                if (data.showRightPanel === false) {
                    document.write('<style>body.state-idle #panel-right, body.state-form #panel-right { display: none !important; }</style>');
                }
                if (data.idleHeadMode === 'logo' && data.logoUrl) {
                    document.write('<style>#main-title { display: none !important; } #branding-logo { display: block !important; }</style>');
                } else if (data.title) {
                    document.write('<style>#main-title { visibility: hidden; }</style>');
                }
            }
        } catch (e) { console.error("FOUC restore error:", e); }
    