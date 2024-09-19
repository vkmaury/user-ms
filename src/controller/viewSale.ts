import { Request, Response } from 'express';
import Sale from '../models/saleSchema';
import Product from '../models/productSchema';
import Bundle from '../models/bundleSchema'; // Assuming there's a Bundle model for affectedBundles

export const viewSale = async (req: Request, res: Response) => {
    try {
        const saleId = req.query.saleId as string;

        if (!saleId) {
            return res.status(400).json({ message: 'saleId is required' });
        }

        // Fetch the sale from the database using the saleId
        const sale = await Sale.findById(saleId);

        if (!sale) {
            return res.status(404).json({ message: 'Sale not found' });
        }

        if (!sale.isActive) {
            return res.status(404).json({ message: 'Sale is not Active' });
        }

        let productsWithAvailability: any[] = [];

        // Check if affectedProducts are present in the sale
        if (sale.affectedProducts && sale.affectedProducts.length > 0) {
            const productIds = sale.affectedProducts.map((product: any) => product.productId);
            const affectedProducts = await Product.find({ _id: { $in: productIds } });

            const productDetails = affectedProducts.map((product) => {
                const { name, finalePrice, isUnavailable } = product;
            
                if (isUnavailable) {
                    return {
                        productName: name ,
                        MRP: product.MRP,
                        finalPrice: 'Product is unavailable',
                    };
                }

                return {
                    productName: name,
                    MRP: product.MRP,
                    finalPrice: finalePrice,
                };
            });
            console.log(productDetails);

            productsWithAvailability = productsWithAvailability.concat(productDetails);
        }

        // Check if affectedBundles are present in the sale
        if (sale.affectedBundles && sale.affectedBundles.length > 0) {
            const bundleIds = sale.affectedBundles.map((bundle: any) => bundle.bundleId);
            const affectedBundles = await Bundle.find({ _id: { $in: bundleIds } });

            const bundleDetails = affectedBundles.map((bundle) => {
                return {
                    bundleName: bundle.name,
                    bundlePrice: bundle.finalPrice,
                    isUnavailable: bundle.isUnavailable,
                };
            });

            productsWithAvailability = productsWithAvailability.concat(bundleDetails);
        }

        if (productsWithAvailability.length === 0) {
            return res.status(404).json({ message: 'No products or bundles found for this sale' });
        }

        const { affectedProducts: _, affectedBundles: __, ...saleDetails } = sale.toObject(); // Exclude affectedProducts and affectedBundles from sale details

        res.status(200).json({ saleDetails, affectedItems: productsWithAvailability });
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: 'An error occurred', error: error.message });
        } else {
            res.status(500).json({ message: 'An unknown error occurred' });
        }
    }
};
