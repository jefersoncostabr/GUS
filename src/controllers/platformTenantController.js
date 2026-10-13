import mongoose from 'mongoose';
import { getEstudioModel } from '../models/estudiomodel.js';
import { getSolicitanteModel } from '../models/usuariosmodel.js';
import { excluirBancoTenant, invalidarSessoesTenant } from '../services/tenantLifecycleService.js';

const camposTenant = 'nome tenantDbName localizacao ativo approvalStatus trialStartedAt trialEndsAt approvedAt approvedBy rejectedAt rejectedBy rejectionReason createdAt updatedAt';

function studioPublico(estudio) {
    return {
        ...estudio,
        approvalStatus: estudio.approvalStatus || 'approved'
    };
}

export async function listarTenants(req, res) {
    try {
        const Estudio = getEstudioModel(mongoose.connection);
        const estudios = await Estudio.find({
            tenantDbName: { $type: 'string', $ne: '' }
        }).select(camposTenant).sort({ createdAt: -1 }).lean();
        return res.status(200).json(estudios.map(studioPublico));
    } catch (error) {
        console.error('Falha ao listar tenants da plataforma:', error);
        return res.status(500).json({ error: 'Não foi possível listar os tenants.' });
    }
}

export async function listarTenantsPendentes(req, res) {
    try {
        const Estudio = getEstudioModel(mongoose.connection);
        const estudios = await Estudio.find({
            tenantDbName: { $type: 'string', $ne: '' },
            approvalStatus: 'pending'
        })
            .select(camposTenant)
            .sort({ createdAt: 1 })
            .lean();
        return res.status(200).json(estudios.map(studioPublico));
    } catch (error) {
        console.error('Falha ao listar tenants pendentes:', error);
        return res.status(500).json({ error: 'Não foi possível listar os tenants pendentes.' });
    }
}

export async function aprovarTenant(req, res) {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de tenant inválido.' });
        }

        const Estudio = getEstudioModel(mongoose.connection);
        const estudio = await Estudio.findOneAndUpdate(
            { _id: id, approvalStatus: { $nin: ['deleting', 'provisioning'] } },
            {
                $set: {
                    approvalStatus: 'approved',
                    approvedAt: new Date(),
                    approvedBy: req.session.user._id
                },
                $unset: { rejectedAt: 1, rejectedBy: 1, rejectionReason: 1 }
            },
            { new: true, runValidators: true }
        ).select(camposTenant).lean();

        if (!estudio) return res.status(404).json({ error: 'Tenant não encontrado ou em exclusão.' });
        console.info(`[PLATFORM] Tenant aprovado: ${estudio._id} por ${req.session.user._id}`);
        return res.status(200).json({ tenant: studioPublico(estudio) });
    } catch (error) {
        console.error('Falha ao aprovar tenant:', error);
        return res.status(500).json({ error: 'Não foi possível aprovar o tenant.' });
    }
}

export async function reprovarTenant(req, res) {
    try {
        const { id } = req.params;
        const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : '';
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de tenant inválido.' });
        }
        if (!motivo) return res.status(400).json({ error: 'Informe o motivo da reprovação.' });
        if (motivo.length > 1000) return res.status(400).json({ error: 'O motivo não pode exceder 1000 caracteres.' });

        const Estudio = getEstudioModel(mongoose.connection);
        const estudio = await Estudio.findOneAndUpdate(
            { _id: id, approvalStatus: { $nin: ['deleting', 'provisioning'] } },
            {
                $set: {
                    approvalStatus: 'rejected',
                    rejectedAt: new Date(),
                    rejectedBy: req.session.user._id,
                    rejectionReason: motivo
                },
                $unset: { approvedAt: 1, approvedBy: 1 }
            },
            { new: true, runValidators: true }
        ).select(camposTenant).lean();

        if (!estudio) return res.status(404).json({ error: 'Tenant não encontrado ou em exclusão.' });
        console.info(`[PLATFORM] Tenant reprovado: ${estudio._id} por ${req.session.user._id}`);
        return res.status(200).json({ tenant: studioPublico(estudio) });
    } catch (error) {
        console.error('Falha ao reprovar tenant:', error);
        return res.status(500).json({ error: 'Não foi possível reprovar o tenant.' });
    }
}

export async function excluirTenant(req, res) {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID de tenant inválido.' });
    }

    const Estudio = getEstudioModel(mongoose.connection);
    const Solicitante = getSolicitanteModel(mongoose.connection);
    let estudo;
    let statusAnterior;
    let exclusaoIniciada = false;
    let bancoExcluido = false;

    try {
        estudio = await Estudio.findById(id);
        if (!estudo) return res.status(404).json({ error: 'Tenant não encontrado.' });
        if (!estudo.tenantDbName) {
            return res.status(409).json({ error: 'Este registro não possui banco tenant associado.' });
        }
        if (req.body?.confirmTenantDbName !== estudo.tenantDbName) {
            return res.status(400).json({ error: 'Confirme a exclusão enviando o tenantDbName exato do registro.' });
        }

        statusAnterior = estudo.approvalStatus || 'approved';
        if (statusAnterior !== 'deleting') {
            estudo.approvalStatus = 'deleting';
            await estudo.save();
        }
        exclusaoIniciada = true;

        await excluirBancoTenant(estudo.tenantDbName);
        bancoExcluido = true;
        await invalidarSessoesTenant(estudo.tenantDbName);
        await Solicitante.deleteMany({
            $or: [
                { tenantDbName: estudo.tenantDbName },
                { estudio: estudio._id }
            ]
        });
        await Estudio.deleteOne({ _id: estudio._id });

        console.warn(`[PLATFORM] Tenant excluído: ${estudio._id}, banco ${estudio.tenantDbName}, por ${req.session.user._id}`);
        return res.status(200).json({ message: 'Tenant, banco, usuários e sessões relacionados foram excluídos.' });
    } catch (error) {
        console.error('Falha ao excluir tenant:', error);
        if (exclusaoIniciada && !bancoExcluido) {
            await Estudio.updateOne({ _id: id, approvalStatus: 'deleting' }, { $set: { approvalStatus: statusAnterior } });
        }
        return res.status(500).json({
            error: bancoExcluido
                ? 'O banco foi removido, mas a limpeza dos registros Master não terminou. O tenant permanece bloqueado para recuperação.'
                : 'Não foi possível excluir o banco tenant; o tenant foi liberado para uso novamente.'
        });
    }
}