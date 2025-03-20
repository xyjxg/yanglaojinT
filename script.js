// 导出持仓数据（加密）
function exportPortfolio() {
    const portfolio = JSON.parse(localStorage.getItem('portfolio')) || [];
    const exportData = JSON.stringify(portfolio);
    const encodedData = encodeURIComponent(exportData); // 先对字符串进行编码
    const encryptedData = btoa(encodedData); // 再进行 Base64 编码
    prompt('请复制以下代码以导出持仓数据：', encryptedData);
}

// 导入持仓数据（解密）
function importPortfolio() {
    const encryptedData = prompt('请粘贴导出的持仓数据代码：');
    if (encryptedData) {
        try {
            const encodedData = atob(encryptedData); // 先进行 Base64 解码
            const exportData = decodeURIComponent(encodedData); // 再对字符串解码
            const portfolio = JSON.parse(exportData);
            localStorage.setItem('portfolio', JSON.stringify(portfolio));
            location.reload(); // 刷新页面以加载新数据
        } catch (error) {
            alert('导入失败，请检查数据格式是否正确');
        }
    }
}

// 清空持仓数据
function clearPortfolio() {
    if (confirm('确定要清空所有持仓数据吗？')) {
        localStorage.removeItem('portfolio');
        location.reload(); // 刷新页面以清空数据
    }
}

// 从 localStorage 加载持仓数据
function loadPortfolio() {
    const portfolio = JSON.parse(localStorage.getItem('portfolio')) || [];
    portfolio.forEach(stock => {
        addStockToTable(stock.code, stock.quantity, stock.price, stock.name);
    });
    updateTotalValue();
    startPriceUpdates(); // 启动价格更新
}

// 保存持仓数据到 localStorage
function savePortfolio() {
    const portfolio = [];
    document.querySelectorAll('.stock-item').forEach(item => {
        const code = item.querySelector('.stock-code').textContent;
        const quantity = parseInt(item.querySelector('.stock-quantity').textContent);
        const price = parseFloat(item.querySelector('.stock-price').textContent.replace('￥', ''));
        const name = item.querySelector('.stock-name').textContent;
        portfolio.push({ code, quantity, price, name });
    });
    localStorage.setItem('portfolio', JSON.stringify(portfolio));
}

// 添加股票到表格
function addStockToTable(stockCode, quantity, price, stockName) {
    const marketValue = quantity * price;

    const stockItem = document.createElement('div');
    stockItem.className = 'stock-item';
    stockItem.innerHTML = `
        <div class="stock-code">${stockCode.toUpperCase()}</div>
        <div class="stock-name">${stockName}</div>
        <div class="stock-quantity">${quantity}</div>
        <div class="stock-price">￥${price.toFixed(2)}</div>
        <div class="stock-value">￥${marketValue.toFixed(2)}</div>
        <button onclick="deleteStock(this.parentElement)">删除</button>
    `;

    const tableBody = document.getElementById('stockTable').querySelector('tbody');
    if (tableBody.children.length % 3 === 0) {
        const newRow = document.createElement('tr');
        newRow.className = 'stock-row';
        tableBody.appendChild(newRow);
    }
    const lastRow = tableBody.lastElementChild;
    lastRow.appendChild(document.createElement('td')).appendChild(stockItem);
}

// 删除股票
function deleteStock(stockItem) {
    stockItem.remove();
    updateTotalValue();
    savePortfolio(); // 保存持仓数据
}

// 添加股票
function addStock(stockCode, quantity) {
    fetchStockPrice(stockCode).then(data => {
        if (data.price === 0) {
            alert('股票价格获取失败，请检查股票代码是否正确');
            return;
        }
        addStockToTable(stockCode, quantity, data.price, data.name);
        updateTotalValue();
        savePortfolio(); // 保存持仓数据
    });
}

// 获取股票价格和名称
function fetchStockPrice(stockCode) {
    // 判断股票市场
    let secid;
    if (stockCode.startsWith('HK')) {
        // 港股
        const code = stockCode.substring(2);
        secid = `116.${code}`;
    } else if (/^[A-Za-z]+$/.test(stockCode)) {
        // 美股
        secid = `105.${stockCode}`;
    } else {
        // A 股
        if (stockCode.startsWith('SH') || stockCode.startsWith('SZ')) {
            stockCode = stockCode.substring(2);
        }
        if (stockCode.startsWith('6')) {
            secid = `1.${stockCode}`; // 上海交易所
        } else if (stockCode.startsWith('0') || stockCode.startsWith('3')) {
            secid = `0.${stockCode}`; // 深圳交易所
        } else {
            alert('不支持的股票代码格式');
            return Promise.resolve({ price: 0, name: '' });
        }
    }

    const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f58`;

    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('网络请求失败');
            }
            return response.json();
        })
        .then(data => {
            if (data.data && data.data.f43) {
                const price = data.data.f43 / 100; // 价格需要除以100
                const name = data.data.f58; // 股票名称
                return { price, name };
            } else {
                console.error('未获取到价格数据');
                return { price: 0, name: '' };
            }
        })
        .catch(error => {
            console.error('获取股票价格失败：', error);
            return { price: 0, name: '' };
        });
}

// 更新总市值
function updateTotalValue() {
    const stockItems = document.querySelectorAll('.stock-item');
    let totalValue = 0;

    stockItems.forEach(item => {
        const marketValue = parseFloat(item.querySelector('.stock-value').textContent.replace('￥', ''));
        totalValue += marketValue;
    });

    // 更新总市值显示
    document.getElementById('totalValueDisplay').textContent = `￥${totalValue.toFixed(2)}`;
}

// 启动价格更新
function startPriceUpdates() {
    setInterval(() => {
        const stockItems = document.querySelectorAll('.stock-item');
        stockItems.forEach(item => {
            const stockCode = item.querySelector('.stock-code').textContent;
            fetchStockPrice(stockCode).then(data => {
                if (data.price !== 0) {
                    const quantity = parseInt(item.querySelector('.stock-quantity').textContent);
                    const marketValue = quantity * data.price;
                    item.querySelector('.stock-price').textContent = `￥${data.price.toFixed(2)}`;
                    item.querySelector('.stock-value').textContent = `￥${marketValue.toFixed(2)}`;
                }
            });
        });
        updateTotalValue();
    }, 10000); // 每60秒更新一次
}

// 页面加载时加载持仓数据
window.onload = function() {
    loadPortfolio();
};

// 绑定表单提交事件
document.getElementById('stockForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const stockCode = document.getElementById('stockCode').value;
    const quantity = parseInt(document.getElementById('quantity').value);

    if (stockCode && quantity) {
        addStock(stockCode, quantity);
        document.getElementById('stockForm').reset();
    } else {
        alert('请填写股票代码和数量');
    }
});
